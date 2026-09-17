"""Dashboard stats and recent activity."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, Event, SimulationStatus
from schemas import AlertOut, DashboardStats, EventOut
from services.event_simulator import simulator

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total_events = db.query(func.count(Event.id)).scalar() or 0
    anomalies = db.query(func.count(Event.id)).filter(Event.is_anomaly.is_(True)).scalar() or 0
    critical_alerts = (
        db.query(func.count(Alert.id)).filter(Alert.severity == "Critical", Alert.status == "Open").scalar()
        or 0
    )
    avg_risk = db.query(func.avg(Event.risk_score)).scalar() or 0
    failed_spikes = (
        db.query(func.count(Event.id))
        .filter(Event.event_type == "Login Attempt", Event.is_anomaly.is_(True))
        .scalar()
        or 0
    )
    suspicious_tx = (
        db.query(func.count(Event.id))
        .filter(Event.event_type.in_(["Transaction", "Payment"]), Event.is_anomaly.is_(True))
        .scalar()
        or 0
    )
    api_anoms = (
        db.query(func.count(Event.id))
        .filter(Event.event_type == "API Request", Event.is_anomaly.is_(True))
        .scalar()
        or 0
    )
    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == "Open").scalar() or 0
    high_risk = (
        db.query(func.count(Event.id)).filter(Event.risk_level.in_(["High", "Critical"])).scalar() or 0
    )
    sim = db.query(SimulationStatus).first()
    return DashboardStats(
        total_events=total_events,
        anomalies_detected=anomalies,
        critical_alerts=critical_alerts,
        average_risk_score=round(float(avg_risk), 1),
        failed_login_spikes=failed_spikes,
        suspicious_transactions=suspicious_tx,
        api_traffic_anomalies=api_anoms,
        open_alerts=open_alerts,
        high_risk_events=high_risk,
        simulator_running=bool(sim.is_running) if sim else simulator.is_running,
    )


@router.get("/recent-events", response_model=list[EventOut])
def recent_events(limit: int = 20, db: Session = Depends(get_db)):
    rows = db.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()
    return rows


@router.get("/recent-alerts", response_model=list[AlertOut])
def recent_alerts(limit: int = 10, db: Session = Depends(get_db)):
    rows = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
    return rows
