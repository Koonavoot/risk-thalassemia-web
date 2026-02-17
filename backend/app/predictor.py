import os
import joblib
import numpy as np
from pathlib import Path
from typing import Tuple

# Model configuration
MODEL_VERSION = "1.0.0"
THRESHOLD = 0.35

# Feature order for the model
FEATURE_ORDER = [
    'Hb mother', 'Hb father', 'Hct mother', 'Hct father',
    'MCV mother', 'MCV father', 'MCH mother', 'MCH father',
    'Dichrolophenol Indolephenol M', 'Dichrolophenol Indolephenol F'
]


class ThalassemiaPredictor:
    """Predictor class for thalassemia risk assessment."""
    
    def __init__(self, model_path: str = None):
        """Initialize the predictor with model path."""
        if model_path is None:
            model_path = os.path.join(
                Path(__file__).parent.parent, "model", "model.pkl"
            )
        self.model_path = model_path
        self.model = None
        self.model_version = MODEL_VERSION
        self.threshold = THRESHOLD
    
    def load_model(self):
        """Load the XGBoost model from pickle file."""
        try:
            self.model = joblib.load(self.model_path)
            return True
        except FileNotFoundError:
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        except Exception as e:
            raise RuntimeError(f"Failed to load model: {str(e)}")
    
    def _encode_dcip(self, value: str) -> int:
        """Encode DCIP value: Positive = 1, Negative = 0."""
        return 1 if value == "Positive" else 0
    
    def _prepare_features(
        self,
        mother_hb: float,
        father_hb: float,
        mother_hct: float,
        father_hct: float,
        mother_mcv: float,
        father_mcv: float,
        mother_mch: float,
        father_mch: float,
        mother_dcip: str,
        father_dcip: str
    ) -> np.ndarray:
        """
        Prepare features in the correct order for the model.
        
        Feature order:
        ['Hb mother', 'Hb father', 'Hct mother', 'Hct father', 
         'MCV mother', 'MCV father', 'MCH mother', 'MCH father',
         'Dichrolophenol Indolephenol M', 'Dichrolophenol Indolephenol F']
        """
        features = np.array([
            mother_hb,
            father_hb,
            mother_hct,
            father_hct,
            mother_mcv,
            father_mcv,
            mother_mch,
            father_mch,
            self._encode_dcip(mother_dcip),
            self._encode_dcip(father_dcip)
        ]).reshape(1, -1)
        
        return features
    
    def predict(
        self,
        mother_hb: float,
        father_hb: float,
        mother_hct: float,
        father_hct: float,
        mother_mcv: float,
        father_mcv: float,
        mother_mch: float,
        father_mch: float,
        mother_dcip: str,
        father_dcip: str
    ) -> Tuple[str, float]:
        """
        Make a prediction for thalassemia risk.
        
        Returns:
            Tuple[str, float]: (result, probability)
            - result: "Risk" or "No Risk"
            - probability: Probability of risk (0-1)
        """
        if self.model is None:
            self.load_model()
        
        features = self._prepare_features(
            mother_hb, father_hb,
            mother_hct, father_hct,
            mother_mcv, father_mcv,
            mother_mch, father_mch,
            mother_dcip, father_dcip
        )
        
        try:
            # Get probability of class 1 (Risk)
            probability = self.model.predict_proba(features)[0, 1]
            
            # Apply threshold
            if probability >= self.threshold:
                result = "Risk"
            else:
                result = "No Risk"
            
            return result, float(probability)
        
        except Exception as e:
            raise RuntimeError(f"Prediction failed: {str(e)}")


# Global predictor instance
predictor = ThalassemiaPredictor()
