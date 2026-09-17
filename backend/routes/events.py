"""Events API."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, Event
from schemas import EventAnalyzeRequest, EventListResponse, EventOut, ExplanationOut
from services.ai_explanation_service import generate_anomaly_explanation
from services.event_simulator import simulator

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=EventListResponse)
def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    event_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    user_id: Optional[str] = None,
    ip: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    anomalies_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Event)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    if risk_level:
        q = q.filter(Event.risk_level == risk_level)
    if user_id:
        q = q.filter(Event.user_id == user_id)
    if ip:
        q = q.filter(Event.ip_address.contains(ip))
    if location:
        q = q.filter(Event.location.contains(location))
    if anomalies_only:
        q = q.filter(Event.is_anomaly.is_(True))
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Event.event_id.ilike(like))
            | (Event.user_id.ilike(like))
            | (Event.ip_address.ilike(like))
            | (Event.location.ilike(like))
            | (Event.explanation_summary.ilike(like))
        )
    total = q.count()
    rows = (
        q.order_by(Event.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return EventListResponse(items=rows, total=total, page=page, page_size=page_size)


@router.get("/{event_pk}", response_model=EventOut)
def get_event(event_pk: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_pk).first()
    if not event:
        # try by event_id string via alternate path handled in frontend usually by id
        event = db.query(Event).filter(Event.event_id == str(event_pk)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/by-code/{event_id}", response_model=EventOut)
def get_event_by_code(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/user/{user_id}", response_model=list[EventOut])
def events_for_user(user_id: str, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(Event)
        .filter(Event.user_id == user_id)
        .order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )


@router.post("/analyze", response_model=EventOut)
async def analyze_event(payload: EventAnalyzeRequest, db: Session = Depends(get_db)):
    event = await simulator.analyze_external(db, payload.model_dump())
    return event


@router.get("/{event_pk}/explanation", response_model=ExplanationOut)
async def event_explanation(event_pk: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_pk).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    explanation = await generate_anomaly_explanation(
        {
            "event_type": event.event_type,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "location": event.location,
            "device": event.device,
            "amount": event.amount,
            "status": event.status,
            "metadata_json": event.metadata_json or {},
        },
        event.risk_score,
        event.risk_factors or [],
    )
    return explanation


@router.get("/{event_pk}/related-alerts", response_model=list)
def related_alerts(event_pk: int, db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.event_id == event_pk).all()
