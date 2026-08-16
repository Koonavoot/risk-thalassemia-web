import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    """Database model for authenticated users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Prediction(Base):
    """Database model for thalassemia predictions."""
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Father Information
    father_patient_id = Column(String(50), nullable=True)
    father_first_name = Column(String(100))
    father_last_name = Column(String(100))
    father_dob = Column(DateTime, nullable=True)
    father_age = Column(Integer, nullable=True)
    father_hb = Column(Float, nullable=False)
    father_hct = Column(Float, nullable=False)
    father_mcv = Column(Float, nullable=False)
    father_mch = Column(Float, nullable=False)
    father_dcip = Column(Boolean, nullable=False)

    # Mother Information
    mother_patient_id = Column(String(50), nullable=True)
    mother_first_name = Column(String(100))
    mother_last_name = Column(String(100))
    mother_dob = Column(DateTime, nullable=True)
    mother_age = Column(Integer, nullable=True)
    mother_hb = Column(Float, nullable=False)
    mother_hct = Column(Float, nullable=False)
    mother_mcv = Column(Float, nullable=False)
    mother_mch = Column(Float, nullable=False)
    mother_dcip = Column(Boolean, nullable=False)

    # Model & Prediction
    model_version = Column(String(50), nullable=False)
    threshold_used = Column(Float, nullable=False)
    probability = Column(Float, nullable=False)
    result = Column(String(20), nullable=False)
    models_json = Column(Text, nullable=True)  # JSON array of all model results

    # Metadata
    visit_datetime = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint('father_age >= 0', name='check_father_age'),
        CheckConstraint('mother_age >= 0', name='check_mother_age'),
        CheckConstraint('father_hb > 0', name='check_father_hb'),
        CheckConstraint('mother_hb > 0', name='check_mother_hb'),
        CheckConstraint('father_hct BETWEEN 0 AND 100', name='check_father_hct'),
        CheckConstraint('mother_hct BETWEEN 0 AND 100', name='check_mother_hct'),
        CheckConstraint('probability BETWEEN 0 AND 1', name='check_probability'),
        CheckConstraint("result IN ('Risk', 'No Risk')", name='check_result'),
    )


class Feedback(Base):
    """Database model for contact form feedbacks."""
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    email_status = Column(String(20), default="pending", nullable=False)  # pending, sent, failed
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
