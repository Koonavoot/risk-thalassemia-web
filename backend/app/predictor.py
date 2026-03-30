"""
Meta-Tabular Transformer predictor for thalassemia risk assessment.

Replaces the previous XGBoost predictor. Uses the Meta_Tabular_final.pt
PyTorch model together with sklearn preprocessing artifacts stored in
backend/model/.
"""
import os
import joblib
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path
from typing import Tuple

# ---------------------------------------------------------------------------
# Model Architecture — must match the architecture used during training
# ---------------------------------------------------------------------------

class MultiHeadSelfAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.out_proj = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        B, T, D = x.shape
        qkv = self.qkv(x).reshape(B, T, 3, self.n_heads, self.d_k)
        qkv = qkv.permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        scale = self.d_k ** -0.5
        attn = (q @ k.transpose(-2, -1)) * scale
        attn = attn.softmax(dim=-1)
        attn = self.dropout(attn)
        out = (attn @ v).transpose(1, 2).reshape(B, T, D)
        return self.out_proj(out)


class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        self.norm1 = nn.LayerNorm(d_model)
        self.attn = MultiHeadSelfAttention(d_model, n_heads, dropout)
        self.norm2 = nn.LayerNorm(d_model)
        self.ff = nn.Sequential(
            nn.Linear(d_model, d_model * 4),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model * 4, d_model),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        x = x + self.attn(self.norm1(x))
        x = x + self.ff(self.norm2(x))
        return x


class MetaTabularTransformer(nn.Module):
    """
    Tabular Transformer model.

    Architecture:
    - Feature embedding: each input feature → d_block embedding
    - n_blocks Transformer layers
    - Classifier head (binary output)
    """

    def __init__(
        self,
        input_dim: int,
        d_block: int = 192,
        n_blocks: int = 2,
        attention_n_heads: int = 8,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.feature_embedding = nn.Linear(1, d_block)
        self.blocks = nn.ModuleList(
            [TransformerBlock(d_block, attention_n_heads, dropout) for _ in range(n_blocks)]
        )
        self.norm = nn.LayerNorm(d_block)
        self.classifier = nn.Sequential(
            nn.Linear(d_block * input_dim, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, input_dim)
        x = x.unsqueeze(-1)                         # (B, input_dim, 1)
        x = self.feature_embedding(x)               # (B, input_dim, d_block)
        for block in self.blocks:
            x = block(x)
        x = self.norm(x)                            # (B, input_dim, d_block)
        x = x.flatten(1)                            # (B, input_dim * d_block)
        return self.classifier(x)                   # (B, 1)


# ---------------------------------------------------------------------------
# Predictor class
# ---------------------------------------------------------------------------

MODEL_VERSION = "2.0.0-transformer"


class ThalassemiaPredictor:
    """Predictor class using Meta-Tabular Transformer for thalassemia risk."""

    def __init__(self, model_dir: str = None):
        if model_dir is None:
            model_dir = os.path.join(Path(__file__).parent.parent, "model")
        self.model_dir = model_dir
        self.model: MetaTabularTransformer = None
        self.scaler = None
        self.label_encoders: dict = None
        self.y_encoder = None
        self.configs: dict = None
        self.threshold: float = 0.1       # default; overridden from configs
        self.model_version: str = MODEL_VERSION

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load_model(self):
        """Load PyTorch model weights and sklearn preprocessing artifacts."""
        try:
            # 1. Load configs
            configs_path = os.path.join(self.model_dir, "transformer_configs.pkl")
            self.configs = joblib.load(configs_path)
            self.threshold = self.configs.get("threshold", 0.1)
            meta_cfg = self.configs["meta_config"]

            # 2. Instantiate architecture & load weights
            self.model = MetaTabularTransformer(
                input_dim=self.configs["meta_input_dim"],
                d_block=meta_cfg["d_block"],
                n_blocks=meta_cfg["n_blocks"],
                attention_n_heads=meta_cfg["attention_n_heads"],
                dropout=meta_cfg["dropout"],
            )
            weights_path = os.path.join(self.model_dir, "Meta_Tabular_final.pt")
            state = torch.load(weights_path, map_location=torch.device("cpu"), weights_only=True)
            self.model.load_state_dict(state)
            self.model.eval()

            # 3. Load preprocessing artifacts
            self.scaler = joblib.load(os.path.join(self.model_dir, "transformer_scaler.pkl"))
            self.label_encoders = joblib.load(
                os.path.join(self.model_dir, "transformer_label_encoders.pkl")
            )
            self.y_encoder = joblib.load(
                os.path.join(self.model_dir, "transformer_y_encoder.pkl")
            )
            return True

        except FileNotFoundError as e:
            raise FileNotFoundError(f"Model artifact not found: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to load model: {e}")

    # ------------------------------------------------------------------
    # Preprocessing
    # ------------------------------------------------------------------

    def _prepare_features(
        self,
        mother_hb: float, father_hb: float,
        mother_hct: float, father_hct: float,
        mother_mcv: float, father_mcv: float,
        mother_mch: float, father_mch: float,
        mother_dcip: str, father_dcip: str,
    ) -> np.ndarray:
        """
        Build a (1, 10) feature array in the exact column order the model
        was trained on:
          num_cols: ['Hb mother','Hct mother','MCH mother','MCV mother',
                     'Hb father','Hct father','MCH father','MCV father']
          cat_cols: ['Dichrolophenol Indolephenol M','Dichrolophenol Indolephenol F']
        """
        num_cols = self.configs["num_cols"]
        cat_cols = self.configs["cat_cols"]

        num_values = {
            'Hb mother': mother_hb,
            'Hct mother': mother_hct,
            'MCH mother': mother_mch,
            'MCV mother': mother_mcv,
            'Hb father': father_hb,
            'Hct father': father_hct,
            'MCH father': father_mch,
            'MCV father': father_mcv,
        }

        cat_values = {
            'Dichrolophenol Indolephenol M': mother_dcip,
            'Dichrolophenol Indolephenol F': father_dcip,
        }

        # Scale numeric features
        num_array = np.array([[num_values[c] for c in num_cols]])
        num_scaled = self.scaler.transform(num_array)

        # Encode categorical features
        cat_encoded = []
        for col in cat_cols:
            enc = self.label_encoders[col]
            cat_encoded.append(enc.transform([cat_values[col]])[0])
        cat_array = np.array([cat_encoded], dtype=float)

        # Concatenate: numerics first, then categoricals (matches training)
        features = np.concatenate([num_scaled, cat_array], axis=1)
        return features.astype(np.float32)

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(
        self,
        mother_hb: float, father_hb: float,
        mother_hct: float, father_hct: float,
        mother_mcv: float, father_mcv: float,
        mother_mch: float, father_mch: float,
        mother_dcip: str, father_dcip: str,
    ) -> Tuple[str, float]:
        """
        Predict thalassemia risk.

        Returns:
            (result, probability)
            - result: "Risk" or "No Risk"
            - probability: float in [0, 1]
        """
        if self.model is None:
            self.load_model()

        features = self._prepare_features(
            mother_hb, father_hb,
            mother_hct, father_hct,
            mother_mcv, father_mcv,
            mother_mch, father_mch,
            mother_dcip, father_dcip,
        )

        try:
            x_tensor = torch.tensor(features, dtype=torch.float32)
            with torch.no_grad():
                logits = self.model(x_tensor)          # (1, 1)
                probability = torch.sigmoid(logits).item()

            # Map to label using y_encoder classes_
            # classes_[0] = 'no risk of thalassemia', classes_[1] = 'risk of thalassemia'
            pred_idx = int(probability >= self.threshold)
            raw_label = self.y_encoder.classes_[pred_idx]

            if "no risk" in raw_label.lower():
                result = "No Risk"
            else:
                result = "Risk"

            return result, float(probability)

        except Exception as e:
            raise RuntimeError(f"Prediction failed: {e}")


# Global predictor instance (lazy-loaded on first request)
predictor = ThalassemiaPredictor()
THRESHOLD = predictor.threshold
