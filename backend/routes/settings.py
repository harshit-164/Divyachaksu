"""Application settings endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Settings as AppSettings, SimulationStatus
from schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _ensure_settings(db: Session) -> AppSettings:
    row = db.query(AppSettings).first()
    if not row:
        row = AppSettings()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _ensure_settings(db)


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    row = _ensure_settings(db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)

    # Mirror simulation tuning onto simulation status
    status = db.query(SimulationStatus).first()
    if status:
        if "event_simulation_speed" in data:
            status.interval_ms = data["event_simulation_speed"]
        if "anomaly_injection_rate" in data:
            status.anomaly_rate = data["anomaly_injection_rate"]
        db.commit()
    return row
