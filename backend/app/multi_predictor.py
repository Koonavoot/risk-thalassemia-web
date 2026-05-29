"""
Multi-model predictor for thalassemia risk assessment.

Loads and runs five models simultaneously:
  Tree-based  : Random Forest, XGBoost, NGBoost
  Transformer : FT-Transformer, Meta Tabular FT-Transformer

Each model returns its own risk prediction and probability.
"""
import os
import gc
import logging
import joblib
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path
from typing import List, Dict, Tuple, Any
import math
logger = logging.getLogger(__name__)


def _log_memory_usage(label: str):
    """Log current process memory usage for debugging OOM issues."""
    try:
        import resource
        mem_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024  # macOS: bytes, Linux: KB
        # On Linux ru_maxrss is in KB, on macOS it's in bytes
        import sys
        if sys.platform == 'darwin':
            mem_mb /= 1024  # convert bytes to MB
        logger.info(f"[Memory] {label}: ~{mem_mb:.0f} MB (peak RSS)")
    except Exception:
        pass

MODEL_VERSION = "3.0.0-multi"

# ---------------------------------------------------------------------------
# Transformer Architectures
# ---------------------------------------------------------------------------


class MetaTabularTransformer(nn.Module):
    """
    Meta Tabular Transformer matching Meta_Tabular_full.pt checkpoint.

    Architecture (from state_dict):
      input_proj  : Linear(10, 256)
      encoder     : TransformerEncoder — 2 layers, nhead=8, dim_feedforward=1024
      classifier  : Sequential(LayerNorm(256), Linear(256, 1))
    """

    def __init__(
        self,
        input_dim: int = 10,
        d_model: int = 256,
        nhead: int = 8,
        num_layers: int = 2,
        dim_feedforward: int = 1024,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.classifier = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.input_proj(x)      # (B, d_model)
        x = x.unsqueeze(1)          # (B, 1, d_model)
        x = self.encoder(x)         # (B, 1, d_model)
        x = x.squeeze(1)            # (B, d_model)
        return self.classifier(x)   # (B, 1)


class FTTransformerBlock(nn.Module):
    """Single FT-Transformer block with attention and FFN."""

    def __init__(self, d_model: int, nhead: int, d_ffn: int, dropout: float,
                 has_attention_norm: bool = True, act_type: str = "gelu"):
        super().__init__()
        # Multi-head attention (manual W_q/W_k/W_v/W_out)
        self.attention = FTMultiheadAttention(d_model, nhead, dropout)
        # FFN
        self.ffn_normalization = nn.LayerNorm(d_model)
        self.ffn = FTTransformerFFN(d_model, d_ffn, dropout, act_type=act_type)
        # Some blocks have attention_normalization, some don't (block 0 doesn't)
        self.has_attention_norm = has_attention_norm
        if has_attention_norm:
            self.attention_normalization = nn.LayerNorm(d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Pre-norm attention
        if self.has_attention_norm:
            x_normed = self.attention_normalization(x)
        else:
            x_normed = x
        x = x + self.attention(x_normed)
        # Pre-norm FFN
        x = x + self.ffn(self.ffn_normalization(x))
        return x


class FTMultiheadAttention(nn.Module):
    """Custom multi-head attention matching FT-Transformer checkpoint."""

    def __init__(self, d_model: int, nhead: int, dropout: float = 0.0):
        super().__init__()
        self.nhead = nhead
        self.head_dim = d_model // nhead
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_out = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)
        self.scale = self.head_dim ** -0.5

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, S, D = x.shape
        q = self.W_q(x).view(B, S, self.nhead, self.head_dim).transpose(1, 2)
        k = self.W_k(x).view(B, S, self.nhead, self.head_dim).transpose(1, 2)
        v = self.W_v(x).view(B, S, self.nhead, self.head_dim).transpose(1, 2)

        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = torch.softmax(attn, dim=-1)
        attn = self.dropout(attn)

        out = (attn @ v).transpose(1, 2).contiguous().view(B, S, D)
        return self.W_out(out)


class FTTransformerFFN(nn.Module):
    """FFN with customizable activation (GELU or ReGLU)."""

    def __init__(self, d_model: int, d_ffn: int, dropout: float = 0.0, act_type: str = "gelu"):
        super().__init__()
        self.act_type = act_type
        if self.act_type == "reglu":
            self.linear1 = nn.Linear(d_model, d_ffn * 2)
            self.linear2 = nn.Linear(d_ffn, d_model)
        else:
            self.linear1 = nn.Linear(d_model, d_ffn)
            self.linear2 = nn.Linear(d_ffn, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.linear1(x)
        if self.act_type == "reglu":
            gate, value = x.chunk(2, dim=-1)
            x = torch.relu(gate) * value
        else:
            x = torch.nn.functional.gelu(x)
        x = self.dropout(x)
        return self.linear2(x)


class FTTransformer(nn.Module):
    """
    FT-Transformer matching FT_Transformer_full.pt checkpoint.

    Architecture (from state_dict):
      cls_embedding   : Parameter(d_model)
      periodic_coeff  : Parameter(n_cont, d_model // 2) (from num_emb state)
      cat_embeddings  : Embedding per categorical feature
                        + shared cat_bias
      backbone_blocks : List of FTTransformerBlock (attention + FFN)
      output_norm     : LayerNorm(d_model)
      output_linear   : Linear(d_model, 1)
    """

    def __init__(
        self,
        n_cont: int = 8,
        cat_cardinalities: list = None,
        d_model: int = 96,
        nhead: int = 4,
        n_blocks: int = 3,
        d_ffn: int = 128,
        dropout: float = 0.2,
        act_type: str = "gelu",
    ):
        super().__init__()
        if cat_cardinalities is None:
            cat_cardinalities = [2, 2]

        self.n_cont = n_cont
        self.n_cat = len(cat_cardinalities)
        self.d_model = d_model

        # CLS token embedding
        self.cls_embedding = nn.Parameter(torch.zeros(d_model))

        # Continuous feature embeddings using PeriodicEmbedding
        # The trained model uses PeriodicEmbedding(n_cont, d_model)
        self.periodic_coeff = nn.Parameter(torch.zeros(n_cont, d_model // 2))

        # Categorical embeddings
        self.cat_embeddings = nn.ModuleList([
            nn.Embedding(card, d_model) for card in cat_cardinalities
        ])
        self.cat_bias = nn.Parameter(torch.zeros(self.n_cat, d_model))

        # Transformer blocks
        blocks = []
        for i in range(n_blocks):
            has_attn_norm = (i > 0)  # block 0 has no attention_normalization
            blocks.append(
                FTTransformerBlock(d_model, nhead, d_ffn, dropout,
                                   has_attention_norm=has_attn_norm, act_type=act_type)
            )
        self.backbone_blocks = nn.ModuleList(blocks)

        # Output head
        self.output_norm = nn.LayerNorm(d_model)
        self.output_linear = nn.Linear(d_model, 1)

    def forward(self, x_cont: torch.Tensor, x_cat: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x_cont: (B, n_cont) continuous features (scaled)
            x_cat:  (B, n_cat)  categorical features (integer encoded)
        Returns:
            logits: (B, 1)
        """
        B = x_cont.shape[0]

        # CLS token
        cls = self.cls_embedding.unsqueeze(0).expand(B, -1).unsqueeze(1)  # (B, 1, d)

        # Continuous embeddings via PeriodicEmbedding
        # x_cont: (B, n_cont) -> (B, n_cont, 1) * (n_cont, d_model//2) -> (B, n_cont, d_model//2)
        x_cont_proj = x_cont.unsqueeze(-1) * self.periodic_coeff.unsqueeze(0) * 2 * math.pi
        cont_emb = torch.cat([torch.sin(x_cont_proj), torch.cos(x_cont_proj)], dim=-1)

        # Categorical embeddings
        cat_embs = []
        for i, emb_layer in enumerate(self.cat_embeddings):
            cat_embs.append(emb_layer(x_cat[:, i]))  # (B, d)
        cat_emb = torch.stack(cat_embs, dim=1)  # (B, n_cat, d)
        cat_emb = cat_emb + self.cat_bias.unsqueeze(0)

        # Combine: [CLS, cont_features, cat_features]
        tokens = torch.cat([cls, cont_emb, cat_emb], dim=1)  # (B, 1+n_cont+n_cat, d)

        # Transformer blocks
        x = tokens
        for block in self.backbone_blocks:
            x = block(x)

        # Take CLS token output
        cls_out = x[:, 0, :]  # (B, d)
        cls_out = self.output_norm(cls_out)
        return self.output_linear(cls_out)  # (B, 1)

    def load_checkpoint(self, state_dict: dict, num_emb_state: dict = None):
        """Load state dict with key mapping from checkpoint format."""
        new_state = {}

        # Handle main model weights
        for key, value in state_dict.items():
            if key == "cls_embedding.weight":
                new_state["cls_embedding"] = value
            elif key == "cat_embeddings.bias":
                new_state["cat_bias"] = value
            elif key.startswith("cat_embeddings.embeddings."):
                # cat_embeddings.embeddings.0.weight -> cat_embeddings.0.weight
                new_key = key.replace("cat_embeddings.embeddings.", "cat_embeddings.")
                new_state[new_key] = value
            elif key.startswith("backbone.blocks."):
                # backbone.blocks.X.yyy -> backbone_blocks.X.yyy
                new_key = key.replace("backbone.blocks.", "backbone_blocks.")
                new_state[new_key] = value
            elif key == "backbone.output.normalization.weight":
                new_state["output_norm.weight"] = value
            elif key == "backbone.output.normalization.bias":
                new_state["output_norm.bias"] = value
            elif key == "backbone.output.linear.weight":
                new_state["output_linear.weight"] = value
            elif key == "backbone.output.linear.bias":
                new_state["output_linear.bias"] = value
            else:
                new_state[key] = value

        # Handle periodic embedding weights if provided
        if num_emb_state and "coeff" in num_emb_state:
            new_state["periodic_coeff"] = num_emb_state["coeff"]

        # Load with strict=False to allow missing periodic_coeff if not in this dict
        self.load_state_dict(new_state, strict=False)


# ---------------------------------------------------------------------------
# Multi-model predictor
# ---------------------------------------------------------------------------

class MultiModelPredictor:
    """Predictor that loads and runs all 5 models."""

    # Thresholds from model_selected.py
    RF_THRESHOLD = 0.6435
    XGB_THRESHOLD = 0.2179
    NGB_THRESHOLD = 0.4951
    TRANSFORMER_THRESHOLD = 0.1  # overridden from configs

    MODEL_NAMES = [
        "Random Forest",
        "XGBoost",
        "NGBoost",
        "FT-Transformer",
        "Meta Tabular FT-Transformer",
    ]

    def __init__(
        self,
        treebase_dir: str = None,
        transformer_dir: str = None,
    ):
        base = Path(__file__).parent.parent
        self.treebase_dir = treebase_dir or str(base / "model" / "model_treebase")
        self.transformer_dir = transformer_dir or str(base / "model" / "model_transformer")

        # Tree-based models & preprocessors
        self.rf_model = None
        self.xgb_model = None
        self.ngb_model = None
        self.tree_scaler = None
        self.tree_label_encoders = None
        self.tree_y_encoder = None

        # Transformer models & preprocessors
        self.ft_model: FTTransformer = None
        self.meta_model: MetaTabularTransformer = None
        self.trans_scaler = None
        self.trans_label_encoders = None
        self.trans_y_encoder = None
        self.trans_configs = None
        self.ft_threshold = self.TRANSFORMER_THRESHOLD
        self.meta_threshold = self.TRANSFORMER_THRESHOLD

        self._loaded = False

    def load_models(self):
        """Load all models and preprocessors with memory-efficient staged loading."""
        if self._loaded:
            return

        logger.info("Loading all 5 models (staged for memory efficiency)...")
        _log_memory_usage("Before model loading")

        self._load_tree_models()
        gc.collect()  # Free transient loading memory before next stage
        _log_memory_usage("After tree models + GC")

        self._load_transformer_models()
        gc.collect()
        _log_memory_usage("After transformer models + GC")

        self._loaded = True
        logger.info("All 5 models loaded successfully")

    def _load_tree_models(self):
        """Load tree-based models and their preprocessors."""
        logger.info("Loading tree-based models...")

        self.tree_scaler = joblib.load(
            os.path.join(self.treebase_dir, "scaler.pkl"))
        self.tree_label_encoders = joblib.load(
            os.path.join(self.treebase_dir, "label_encoders.pkl"))
        self.tree_y_encoder = joblib.load(
            os.path.join(self.treebase_dir, "y_encoder.pkl"))

        self.rf_model = joblib.load(
            os.path.join(self.treebase_dir, "RandomForest_full.pkl"))
        self.xgb_model = joblib.load(
            os.path.join(self.treebase_dir, "XGBoost_full.pkl"))
        self.ngb_model = joblib.load(
            os.path.join(self.treebase_dir, "NGBoost_full.pkl"))

        logger.info("Tree-based models loaded (RF, XGB, NGB)")

    def _load_transformer_models(self):
        """Load transformer models and their preprocessors."""
        logger.info("Loading transformer models...")

        self.trans_configs = joblib.load(
            os.path.join(self.transformer_dir, "transformer_configs.pkl"))
        self.trans_scaler = joblib.load(
            os.path.join(self.transformer_dir, "transformer_scaler.pkl"))
        self.trans_label_encoders = joblib.load(
            os.path.join(self.transformer_dir, "transformer_label_encoders.pkl"))
        self.trans_y_encoder = joblib.load(
            os.path.join(self.transformer_dir, "transformer_y_encoder.pkl"))

        # Extract thresholds from config
        self.ft_threshold = self.trans_configs.get("ft_threshold", self.trans_configs.get("threshold", 0.1))
        self.meta_threshold = self.trans_configs.get("meta_threshold", self.trans_configs.get("threshold", 0.1))

        # FT-Transformer
        ft_cfg = self.trans_configs["ft_config"]
        d_ffn = int(ft_cfg["d_block"] * ft_cfg["ffn_d_hidden_multiplier"])
        num_cont = len(self.trans_configs.get("num_cols", []))
        cat_cards = self.trans_configs.get("cat_cards", self.trans_configs.get("cat_cardinalities", []))

        self.ft_model = FTTransformer(
            n_cont=num_cont,
            cat_cardinalities=cat_cards,
            d_model=ft_cfg["d_block"],
            nhead=ft_cfg["attention_n_heads"],
            n_blocks=ft_cfg["n_blocks"],
            d_ffn=d_ffn,
            dropout=ft_cfg["dropout"],
            act_type=ft_cfg.get("act_type", "gelu"),
        )
        ft_state = torch.load(
            os.path.join(self.transformer_dir, "FT_Transformer_full.pt"),
            map_location=torch.device("cpu"),
            weights_only=True,
        )
        if "model" in ft_state:
            num_emb_state = ft_state.get("num_emb")
            self.ft_model.load_checkpoint(ft_state["model"], num_emb_state=num_emb_state)
        else:
            self.ft_model.load_checkpoint(ft_state)
        del ft_state  # Free checkpoint dict immediately

        self.ft_model.eval()
        logger.info("FT-Transformer loaded")

        # Meta Tabular Transformer
        meta_cfg = self.trans_configs["meta_config"]
        self.meta_model = MetaTabularTransformer(
            input_dim=self.trans_configs["meta_input_dim"],
            d_model=meta_cfg["d_block"],
            nhead=meta_cfg["attention_n_heads"],
            num_layers=meta_cfg["n_blocks"],
            dim_feedforward=meta_cfg["d_block"] * 4,
            dropout=meta_cfg["dropout"],
        )
        meta_state = torch.load(
            os.path.join(self.transformer_dir, "Meta_Tabular_full.pt"),
            map_location=torch.device("cpu"),
            weights_only=True,
        )
        if "model" in meta_state:
            meta_state = meta_state["model"]
        self.meta_model.load_state_dict(meta_state)
        del meta_state  # Free checkpoint dict immediately

        self.meta_model.eval()
        logger.info("Meta Tabular Transformer loaded")

    # ------------------------------------------------------------------
    # Preprocessing
    # ------------------------------------------------------------------

    def _map_blood_values(
        self,
        mother_hb, father_hb,
        mother_hct, father_hct,
        mother_mcv, father_mcv,
        mother_mch, father_mch,
        mother_dcip, father_dcip,
    ) -> dict:
        """Map API field names to training column names."""
        return {
            "num": {
                'Hb mother': mother_hb,
                'Hct mother': mother_hct,
                'MCH mother': mother_mch,
                'MCV mother': mother_mcv,
                'Hb father': father_hb,
                'Hct father': father_hct,
                'MCH father': father_mch,
                'MCV father': father_mcv,
            },
            "cat": {
                'Dichrolophenol Indolephenol M': mother_dcip,
                'Dichrolophenol Indolephenol F': father_dcip,
            },
        }

    def _prepare_tree_features(self, blood: dict) -> np.ndarray:
        """Prepare features for tree-based models. Returns (1, 10) array."""
        num_cols = list(blood["num"].keys())
        cat_cols = list(blood["cat"].keys())

        num_array = np.array([[blood["num"][c] for c in num_cols]])
        num_scaled = self.tree_scaler.transform(num_array)

        cat_encoded = []
        for col in cat_cols:
            enc = self.tree_label_encoders[col]
            cat_encoded.append(enc.transform([blood["cat"][col]])[0])
        cat_array = np.array([cat_encoded], dtype=float)

        return np.concatenate([num_scaled, cat_array], axis=1)

    def _prepare_transformer_features(self, blood: dict) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare features for transformer models.

        Returns:
            (num_scaled, cat_encoded) — both (1, n) arrays
        """
        num_cols = self.trans_configs["num_cols"]
        cat_cols = self.trans_configs["cat_cols"]

        num_array = np.array([[blood["num"][c] for c in num_cols]])
        num_scaled = self.trans_scaler.transform(num_array)

        cat_encoded = []
        for col in cat_cols:
            enc = self.trans_label_encoders[col]
            cat_encoded.append(enc.transform([blood["cat"][col]])[0])
        cat_array = np.array([cat_encoded], dtype=int)

        return num_scaled.astype(np.float32), cat_array

    def _resolve_label(self, prob: float, threshold: float, y_encoder) -> str:
        """Resolve probability to Risk/No Risk label."""
        pred_idx = int(prob >= threshold)
        raw_label = y_encoder.classes_[pred_idx]
        return "No Risk" if "no risk" in raw_label.lower() else "Risk"

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict_all(
        self,
        mother_hb: float, father_hb: float,
        mother_hct: float, father_hct: float,
        mother_mcv: float, father_mcv: float,
        mother_mch: float, father_mch: float,
        mother_dcip: str, father_dcip: str,
    ) -> List[Dict[str, Any]]:
        """
        Run all 5 models and return a list of results.

        Returns list of dicts with keys:
            model_name, result, probability, probability_percent, threshold_used
        """
        if not self._loaded:
            self.load_models()

        blood = self._map_blood_values(
            mother_hb, father_hb,
            mother_hct, father_hct,
            mother_mcv, father_mcv,
            mother_mch, father_mch,
            mother_dcip, father_dcip,
        )

        results = []

        # --- Tree-based models ---
        tree_features = self._prepare_tree_features(blood)

        # Random Forest
        rf_proba = self.rf_model.predict_proba(tree_features)[0, 1]
        results.append({
            "model_name": "Random Forest",
            "result": self._resolve_label(rf_proba, self.RF_THRESHOLD, self.tree_y_encoder),
            "probability": float(rf_proba),
            "probability_percent": round(float(rf_proba) * 100, 2),
            "threshold_used": self.RF_THRESHOLD,
        })

        # XGBoost
        xgb_proba = self.xgb_model.predict_proba(tree_features)[0, 1]
        results.append({
            "model_name": "XGBoost",
            "result": self._resolve_label(xgb_proba, self.XGB_THRESHOLD, self.tree_y_encoder),
            "probability": float(xgb_proba),
            "probability_percent": round(float(xgb_proba) * 100, 2),
            "threshold_used": self.XGB_THRESHOLD,
        })

        # NGBoost
        ngb_dist = self.ngb_model.pred_dist(tree_features)
        ngb_proba = float(ngb_dist.params["p1"][0])
        results.append({
            "model_name": "NGBoost",
            "result": self._resolve_label(ngb_proba, self.NGB_THRESHOLD, self.tree_y_encoder),
            "probability": ngb_proba,
            "probability_percent": round(ngb_proba * 100, 2),
            "threshold_used": self.NGB_THRESHOLD,
        })

        # --- Transformer models ---
        num_scaled, cat_encoded = self._prepare_transformer_features(blood)

        # FT-Transformer (uses separate cont/cat inputs)
        x_cont = torch.tensor(num_scaled, dtype=torch.float32)
        x_cat = torch.tensor(cat_encoded, dtype=torch.long)
        with torch.no_grad():
            ft_logits = self.ft_model(x_cont, x_cat)
            ft_proba = float(torch.sigmoid(ft_logits).item())
        results.append({
            "model_name": "FT-Transformer",
            "result": self._resolve_label(ft_proba, self.ft_threshold, self.trans_y_encoder),
            "probability": ft_proba,
            "probability_percent": round(ft_proba * 100, 2),
            "threshold_used": self.ft_threshold,
        })

        # Meta Tabular Transformer (uses concatenated features)
        meta_features = np.concatenate(
            [num_scaled, cat_encoded.astype(np.float32)], axis=1
        )
        x_meta = torch.tensor(meta_features, dtype=torch.float32)
        with torch.no_grad():
            meta_logits = self.meta_model(x_meta)
            meta_proba = float(torch.sigmoid(meta_logits).item())
        results.append({
            "model_name": "Meta Tabular FT-Transformer",
            "result": self._resolve_label(meta_proba, self.meta_threshold, self.trans_y_encoder),
            "probability": meta_proba,
            "probability_percent": round(meta_proba * 100, 2),
            "threshold_used": self.meta_threshold,
        })

        return results


# Global multi-predictor instance (lazy-loaded on first request)
multi_predictor = MultiModelPredictor()
