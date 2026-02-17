from typing import Optional, Literal
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database import get_db
from app.models import Prediction
from app.schemas import PaginatedHistory, HistoryItem, ErrorResponse

router = APIRouter(prefix="/history", tags=["history"])


@router.get(
    "",
    response_model=PaginatedHistory,
    responses={
        500: {"model": ErrorResponse}
    }
)
async def get_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by patient ID"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order by date"),
    db: Session = Depends(get_db)
):
    """
    Get paginated prediction history.
    
    Supports searching by patient ID (father or mother) and sorting by visit date.
    """
    try:
        query = db.query(Prediction)
        
        # Apply search filter
        if search:
            query = query.filter(
                or_(
                    Prediction.father_patient_id.ilike(f"%{search}%"),
                    Prediction.mother_patient_id.ilike(f"%{search}%")
                )
            )
        
        # Apply sorting
        if sort_order == "desc":
            query = query.order_by(desc(Prediction.visit_datetime))
        else:
            query = query.order_by(asc(Prediction.visit_datetime))
        
        # Get total count
        total = query.count()
        
        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        
        # Get paginated results
        predictions = query.offset(offset).limit(page_size).all()
        
        # Convert to response format
        items = [
            HistoryItem(
                id=p.id,
                father_patient_id=p.father_patient_id,
                father_first_name=p.father_first_name,
                father_last_name=p.father_last_name,
                father_age=p.father_age,
                mother_patient_id=p.mother_patient_id,
                mother_first_name=p.mother_first_name,
                mother_last_name=p.mother_last_name,
                mother_age=p.mother_age,
                result=p.result,
                probability=p.probability,
                visit_datetime=p.visit_datetime
            )
            for p in predictions
        ]
        
        return PaginatedHistory(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch history: {str(e)}"
        )


@router.get(
    "/{prediction_id}",
    response_model=HistoryItem,
    responses={
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def get_prediction_detail(
    prediction_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific prediction.
    """
    try:
        prediction = db.query(Prediction).filter(
            Prediction.id == prediction_id
        ).first()
        
        if not prediction:
            raise HTTPException(
                status_code=404,
                detail="Prediction not found"
            )
        
        return HistoryItem(
            id=prediction.id,
            father_patient_id=prediction.father_patient_id,
            father_first_name=prediction.father_first_name,
            father_last_name=prediction.father_last_name,
            father_age=prediction.father_age,
            mother_patient_id=prediction.mother_patient_id,
            mother_first_name=prediction.mother_first_name,
            mother_last_name=prediction.mother_last_name,
            mother_age=prediction.mother_age,
            result=prediction.result,
            probability=prediction.probability,
            visit_datetime=prediction.visit_datetime
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch prediction: {str(e)}"
        )


@router.delete(
    "/{prediction_id}",
    responses={
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def delete_prediction(
    prediction_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete a prediction record.
    """
    try:
        prediction = db.query(Prediction).filter(
            Prediction.id == prediction_id
        ).first()
        
        if not prediction:
            raise HTTPException(
                status_code=404,
                detail="Prediction not found"
            )
        
        db.delete(prediction)
        db.commit()
        
        return {"message": "Prediction deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete prediction: {str(e)}"
        )
