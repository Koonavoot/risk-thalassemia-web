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

class MetaTabularTransformer(nn.Module):
    """
    Tabular Transformer matching Meta_Tabular_final.pt checkpoint.

    Architecture (derived from state_dict keys/shapes):
      input_proj  : Linear(input_dim=10, d_model=192)
      encoder     : nn.TransformerEncoder — 2 layers, nhead=8, dim_feedforward=768
      classifier  : Sequential(LayerNorm(192), Linear(192, 1))
    """

    def __init__(
        self,
        input_dim: int = 10,
        d_model: int = 192,
        nhead: int = 8,
        num_layers: int = 2,
        dim_feedforward: int = 768,
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
        # x: (B, input_dim)
        x = self.input_proj(x)    # (B, d_model)
        x = x.unsqueeze(1)         # (B, 1, d_model) — single sequence token
        x = self.encoder(x)        # (B, 1, d_model)
        x = x.squeeze(1)           # (B, d_model)
        return self.classifier(x)  # (B, 1)


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
                input_dim=self.configs["meta_input_dim"],   # 10
                d_model=meta_cfg["d_block"],                 # 192
                nhead=meta_cfg["attention_n_heads"],          # 8
                num_layers=meta_cfg["n_blocks"],              # 2
                dim_feedforward=768,                          # confirmed from state_dict
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
