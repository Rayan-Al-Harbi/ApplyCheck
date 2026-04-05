import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.utils import extract_text_from_file
from db.config import get_db
from db.models import User, CV
from extraction import extract_cv_profile

logger = logging.getLogger("applycheck.api.cv")

router = APIRouter(prefix="/cv", tags=["cv"])


# --- Response schemas ---

class CVUploadResponse(BaseModel):
    message: str
    word_count: int
    profile: dict


class CVResponse(BaseModel):
    raw_text: str
    profile: dict
    uploaded_at: str
    updated_at: str


# --- Endpoints ---

@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    cv_file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cv_text = await extract_text_from_file(cv_file)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file.")

    # Extract candidate profile via LLM
    profile = extract_cv_profile(cv_text)
    profile_dict = profile.model_dump()

    existing_cv = db.query(CV).filter(CV.user_id == user.id).first()
    if existing_cv:
        existing_cv.raw_text = cv_text
        existing_cv.profile = profile_dict
        existing_cv.updated_at = datetime.now(timezone.utc)
        msg = "CV updated"
    else:
        new_cv = CV(
            user_id=user.id,
            raw_text=cv_text,
            profile=profile_dict,
        )
        db.add(new_cv)
        msg = "CV uploaded"

    db.commit()

    logger.info(f"CV {msg.lower()} for user {user.id}", extra={"event_data": {
        "event": "cv_upload",
        "user_id": str(user.id),
        "word_count": len(cv_text.split()),
    }})

    return CVUploadResponse(
        message=msg,
        word_count=len(cv_text.split()),
        profile=profile_dict,
    )


@router.get("", response_model=CVResponse)
def get_cv(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.user_id == user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="No CV uploaded yet")

    return CVResponse(
        raw_text=cv.raw_text,
        profile=cv.profile,
        uploaded_at=cv.uploaded_at.isoformat(),
        updated_at=cv.updated_at.isoformat(),
    )
