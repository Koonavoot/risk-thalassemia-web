# Model Directory

Place your trained XGBoost model file (`model.pkl`) in this directory.

## Model Requirements

The model should be a scikit-learn compatible XGBoost classifier that:

1. Accepts 10 features in this order:
   - Hb mother (float)
   - Hb father (float)
   - Hct mother (float)
   - Hct father (float)
   - MCV mother (float)
   - MCV father (float)
   - MCH mother (float)
   - MCH father (float)
   - Dichlorophenol Indolephenol M (0 or 1)
   - Dichlorophenol Indolephenol F (0 or 1)

2. Has `predict_proba()` method that returns class probabilities

3. Was saved using joblib:
   ```python
   import joblib
   joblib.dump(model, 'model.pkl')
   ```
