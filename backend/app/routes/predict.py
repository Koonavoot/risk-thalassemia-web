from datetime import date, datetime
import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Prediction, User
from app.schemas import (
    PredictionRequest,
    PredictionResult,
    PredictionSaveRequest,
    PredictionResponse,
    ErrorResponse
)
from app.predictor import predictor, MODEL_VERSION
from app.security import get_current_user

router = APIRouter(prefix="/predict", tags=["predict"])


def calculate_age(dob: date) -> int:
    """Calculate age from date of birth."""
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return age


@router.post(
    "",
    response_model=PredictionResult,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def make_prediction(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Make a thalassemia risk prediction based on parent blood values.
    
    This endpoint takes blood test data from both parents and returns
    the risk assessment without saving to database.
    """
    try:
        result, probability = predictor.predict(
            mother_hb=request.mother.hb,
            father_hb=request.father.hb,
            mother_hct=request.mother.hct,
            father_hct=request.father.hct,
            mother_mcv=request.mother.mcv,
            father_mcv=request.father.mcv,
            mother_mch=request.mother.mch,
            father_mch=request.father.mch,
            mother_dcip=request.mother.dcip,
            father_dcip=request.father.dcip
        )
        
        return PredictionResult(
            result=result,
            probability=probability,
            probability_percent=round(probability * 100, 2),
            threshold_used=predictor.threshold,
            model_version=MODEL_VERSION
        )
    
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logging.error(f"Prediction error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post(
    "/save",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def save_prediction(
    request: PredictionSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a prediction result to the database.
    
    This endpoint saves the prediction along with all parent data
    for historical reference.
    """
    try:
        # Calculate ages (None if DOB not provided)
        father_age = calculate_age(request.father.dob) if request.father.dob else None
        mother_age = calculate_age(request.mother.dob) if request.mother.dob else None

        # Create database record
        prediction = Prediction(
            # Father data
            father_patient_id=request.father.patient_id,
            father_first_name=request.father.first_name,
            father_last_name=request.father.last_name,
            father_dob=datetime.combine(request.father.dob, datetime.min.time()) if request.father.dob else None,
            father_age=father_age,
            father_hb=request.father.hb,
            father_hct=request.father.hct,
            father_mcv=request.father.mcv,
            father_mch=request.father.mch,
            father_dcip=request.father.dcip == "Positive",

            # Mother data
            mother_patient_id=request.mother.patient_id,
            mother_first_name=request.mother.first_name,
            mother_last_name=request.mother.last_name,
            mother_dob=datetime.combine(request.mother.dob, datetime.min.time()) if request.mother.dob else None,
            mother_age=mother_age,
            mother_hb=request.mother.hb,
            mother_hct=request.mother.hct,
            mother_mcv=request.mother.mcv,
            mother_mch=request.mother.mch,
            mother_dcip=request.mother.dcip == "Positive",

            # Prediction data
            model_version=MODEL_VERSION,
            threshold_used=predictor.threshold,
            probability=request.probability,
            result=request.result,

            # Metadata
            visit_datetime=datetime.utcnow()
        )
        
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
        
        return prediction
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save prediction: {str(e)}"
        )
