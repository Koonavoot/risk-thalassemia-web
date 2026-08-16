import os
import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Feedback
from app.schemas import FeedbackCreate, ErrorResponse

from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/contact", tags=["contact"])
limiter = Limiter(key_func=get_remote_address)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY

@router.post("", response_model=dict, responses={500: {"model": ErrorResponse}, 429: {"description": "Rate limit exceeded"}})
@limiter.limit("5/10minutes")
def submit_contact_form(request: Request, feedback_data: FeedbackCreate, db: Session = Depends(get_db)):
    # 1. Save to database with status="pending"
    db_feedback = Feedback(
        name=feedback_data.name,
        email=feedback_data.email,
        subject=feedback_data.subject,
        message=feedback_data.message,
        email_status="pending"
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    # 2. Try to send email via Resend
    try:
        email_html = f"""
        <h2>New Feedback Received</h2>
        <p><strong>Name:</strong> {feedback_data.name}</p>
        <p><strong>Email:</strong> {feedback_data.email}</p>
        <p><strong>Subject:</strong> {feedback_data.subject}</p>
        <h3>Message:</h3>
        <p>{feedback_data.message}</p>
        """
        
        resend.Emails.send({
            "from": "Thalassemia App <onboarding@resend.dev>", 
            "to": "koonavoot.k@gmail.com",
            "subject": f"[Thalassemia Feedback] {feedback_data.subject}",
            "html": email_html
        })
        
        # 3. Update status to "sent"
        db_feedback.email_status = "sent"
        db.commit()
        
        return {"success": True, "message": "Feedback submitted successfully."}
        
    except Exception as e:
        # 4. Update status to "failed" on error
        db_feedback.email_status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
