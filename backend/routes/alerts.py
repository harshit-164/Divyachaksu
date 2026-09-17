"""Alerts API."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Alert
from schemas import AlertListResponse, AlertOut, AlertUpdate, AnalystNoteCreate, AnalystNoteOut
from services.alert_service import add_note, update_alert_status

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    severity: Optional[str] = None,
    status: Optional[str] = None,
    alert_type: Optional[str] = None,
    created_after: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Alert)
    if severity:
        q = q.filter(Alert.severity == severity)
    if status:
        q = q.filter(Alert.status == status)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if created_after:
        try:
            dt = datetime.fromisoformat(created_after.replace("Z", ""))
            q = q.filter(Alert.created_at >= dt)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid created_after datetime") from exc
    total = q.count()
    rows = (
        q.order_by(Alert.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return AlertListResponse(items=rows, total=total, page=page, page_size=page_size)


@router.get("/{alert_pk}", response_model=AlertOut)
def get_alert(alert_pk: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_pk).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.put("/{alert_pk}", response_model=AlertOut)
def update_alert(alert_pk: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_pk).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        alert = update_alert_status(db, alert, data["status"], data.get("assigned_to"))
    else:
        if "assigned_to" in data:
            alert.assigned_to = data["assigned_to"]
        if "recommended_action" in data:
            alert.recommended_action = data["recommended_action"]
        db.commit()
        db.refresh(alert)
    return alert


@router.post("/{alert_pk}/resolve", response_model=AlertOut)
def resolve_alert(alert_pk: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_pk).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return update_alert_status(db, alert, "Resolved")


@router.post("/{alert_pk}/false-positive", response_model=AlertOut)
def false_positive(alert_pk: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_pk).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return update_alert_status(db, alert, "False Positive")


@router.post("/{alert_pk}/notes", response_model=AnalystNoteOut)
def create_note(alert_pk: int, payload: AnalystNoteCreate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_pk).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return add_note(db, alert, payload.note, payload.author_name)
