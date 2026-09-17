"""Analytics endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/events")
def analytics_events(db: Session = Depends(get_db)):
    return {
        "events_over_time": analytics_service.events_over_time(db),
        "event_type_distribution": analytics_service.event_type_distribution(db),
    }


@router.get("/anomalies")
def analytics_anomalies(db: Session = Depends(get_db)):
    return {
        "anomalies_over_time": analytics_service.anomalies_over_time(db),
        "failed_login_trend": analytics_service.failed_login_trend(db),
        "transaction_amount_anomalies": analytics_service.transaction_amount_anomalies(db),
    }


@router.get("/risk")
def analytics_risk(db: Session = Depends(get_db)):
    return {
        "risk_distribution": analytics_service.risk_distribution(db),
        "top_risky_users": analytics_service.top_risky_users(db),
        "top_risky_ips": analytics_service.top_risky_ips(db),
    }


@router.get("/alerts")
def analytics_alerts(db: Session = Depends(get_db)):
    return {
        "alerts_by_severity": analytics_service.alerts_by_severity(db),
    }
