"""User risk profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Event, UserRiskProfile
from schemas import EventOut, UserRiskProfileOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/risk-profiles", response_model=list[UserRiskProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    return (
        db.query(UserRiskProfile)
        .order_by(UserRiskProfile.average_risk_score.desc())
        .all()
    )


@router.get("/risk-profiles/{user_id}")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(UserRiskProfile).filter(UserRiskProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    events = (
        db.query(Event)
        .filter(Event.user_id == user_id)
        .order_by(Event.timestamp.desc())
        .limit(40)
        .all()
    )
    return {
        "profile": UserRiskProfileOut.model_validate(profile),
        "timeline": [EventOut.model_validate(e) for e in events],
    }
