from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional, Literal, List
from uuid import UUID


class ParentData(BaseModel):
    """Schema for parent blood test data."""
    patient_id: Optional[str] = Field(None, max_length=50, description="Patient ID (optional)")
    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    dob: Optional[date] = Field(None, description="Date of birth (optional, use CE / Gregorian calendar)")
    hb: float = Field(..., gt=0, description="Hemoglobin (g/dL)")
    hct: float = Field(..., ge=0, le=100, description="Hematocrit (%)")
    mcv: float = Field(..., description="Mean Corpuscular Volume (fL)")
    mch: float = Field(..., description="Mean Corpuscular Hemoglobin (pg)")
    dcip: Literal["Positive", "Negative"] = Field(..., description="Dichlorophenol Indolephenol result")

    @field_validator('dob')
    @classmethod
    def dob_must_be_past(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        if v >= date.today():
            raise ValueError('Date of birth must be in the past')
        if v.year < 1900:
            raise ValueError('Date of birth year seems invalid (before 1900). Please use CE (Gregorian) year, not Buddhist Era (BE).')
        return v


class PredictionRequest(BaseModel):
    """Schema for prediction request."""
    father: ParentData
    mother: ParentData


# --- Single model result (used in multi-model response) ---

class SingleModelResult(BaseModel):
    """Result from a single prediction model."""
    model_name: str
    result: Literal["Risk", "No Risk"]
    probability: float = Field(..., ge=0, le=1)
    probability_percent: float = Field(..., ge=0, le=100)
    threshold_used: float


class MultiPredictionResult(BaseModel):
    """Response from multi-model prediction endpoint."""
    models: List[SingleModelResult]
    model_version: str
    disclaimer: str = "This tool is intended for screening support only and should not replace professional medical diagnosis or laboratory confirmation."


# --- Legacy single-model result (kept for backward compatibility) ---

class PredictionResult(BaseModel):
    """Schema for prediction result (legacy single-model)."""
    result: Literal["Risk", "No Risk"]
    probability: float = Field(..., ge=0, le=1)
    probability_percent: float = Field(..., ge=0, le=100)
    threshold_used: float
    model_version: str
    disclaimer: str = "This tool is intended for screening support only and should not replace professional medical diagnosis or laboratory confirmation."


# --- Save request (multi-model) ---

class MultiPredictionSaveRequest(BaseModel):
    """Schema for saving multi-model prediction to database."""
    father: ParentData
    mother: ParentData
    models: List[SingleModelResult]


# --- Legacy save request ---

class PredictionSaveRequest(BaseModel):
    """Schema for saving prediction to database (legacy)."""
    father: ParentData
    mother: ParentData
    result: Literal["Risk", "No Risk"]
    probability: float = Field(..., ge=0, le=1)


class PredictionResponse(BaseModel):
    """Schema for prediction response from database."""
    id: UUID
    father_patient_id: Optional[str]
    father_first_name: Optional[str]
    father_last_name: Optional[str]
    father_age: Optional[int]
    mother_patient_id: Optional[str]
    mother_first_name: Optional[str]
    mother_last_name: Optional[str]
    mother_age: Optional[int]
    result: str
    probability: float
    models_json: Optional[str] = None
    visit_datetime: datetime

    class Config:
        from_attributes = True


class HistoryItem(BaseModel):
    """Schema for history list item."""
    id: UUID
    father_patient_id: Optional[str]
    father_first_name: Optional[str]
    father_last_name: Optional[str]
    father_age: Optional[int]
    mother_patient_id: Optional[str]
    mother_first_name: Optional[str]
    mother_last_name: Optional[str]
    mother_age: Optional[int]
    result: str
    probability: float
    models_json: Optional[str] = None
    visit_datetime: datetime
    is_hidden: bool = False

    class Config:
        from_attributes = True


class PredictionDetailResponse(BaseModel):
    """Full detail schema including blood test values for the detail modal."""
    id: UUID
    # Father
    father_patient_id: Optional[str]
    father_first_name: Optional[str]
    father_last_name: Optional[str]
    father_age: Optional[int]
    father_hb: float
    father_hct: float
    father_mcv: float
    father_mch: float
    father_dcip: bool
    # Mother
    mother_patient_id: Optional[str]
    mother_first_name: Optional[str]
    mother_last_name: Optional[str]
    mother_age: Optional[int]
    mother_hb: float
    mother_hct: float
    mother_mcv: float
    mother_mch: float
    mother_dcip: bool
    # Prediction
    result: str
    probability: float
    model_version: Optional[str] = None
    threshold_used: Optional[float] = None
    models_json: Optional[str] = None
    visit_datetime: datetime

    class Config:
        from_attributes = True


class PaginatedHistory(BaseModel):
    """Schema for paginated history response."""
    items: list[HistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    is_admin: bool = False


class ErrorResponse(BaseModel):
    """Schema for error response."""
    error: str
    detail: Optional[str] = None


# --- Auth Schemas ---

class LoginRequest(BaseModel):
    """Schema for login request."""
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Schema for user info response."""
    id: int
    username: str
    is_active: bool

    class Config:
        from_attributes = True


class FeedbackCreate(BaseModel):
    """Schema for creating a new feedback."""
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=10)
