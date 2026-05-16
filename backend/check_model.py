import joblib
import numpy as np
import sys

models = ["RandomForest_full.pkl", "XGBoost_full.pkl", "NGBoost_full.pkl"]
dummy_input = np.zeros((1, 10))

for model_name in models:
    print(f"\n--- Testing {model_name} ---")
    try:
        model = joblib.load(f"/Users/tomzab/Thalassemia_predict_project/backend/model/model_treebase/{model_name}")
        print("Model loaded successfully.")
        
        if hasattr(model, "feature_names_in_"):
            print(f"Feature names: {model.feature_names_in_}")
        
        print("Trying to predict...")
        model.predict(dummy_input)
        print("Prediction successful.")
    except Exception as e:
        print(f"Failed: {type(e).__name__}: {e}")
