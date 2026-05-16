from app.multi_predictor import multi_predictor
results = multi_predictor.predict_all(
    mother_hb=11.5, father_hb=12.0,
    mother_hct=35.0, father_hct=36.0,
    mother_mcv=78.0, father_mcv=80.0,
    mother_mch=26.0, father_mch=27.0,
    mother_dcip="Positive", father_dcip="Negative"
)
print("Prediction Success!")
print(results)
