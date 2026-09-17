"""Report generation service."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from models import Alert, AnomalyReport, Event
from services import analytics_service
from services.ai_explanation_service import generate_report_summary


def _new_report_id() -> str:
    return f"RPT-{uuid.uuid4().hex[:10].upper()}"


def collect_report_data(db: Session, hours: int = 24) -> dict[str, Any]:
    since = datetime.utcnow() - timedelta(hours=hours)
    events = db.query(Event).filter(Event.timestamp >= since).all()
    alerts = db.query(Alert).filter(Alert.created_at >= since).all()
    anomalies = [e for e in events if e.is_anomaly]
    critical_alerts = [a for a in alerts if a.severity == "Critical"]

    login_anoms = [e for e in anomalies if e.event_type == "Login Attempt"]
    tx_anoms = [e for e in anomalies if e.event_type in {"Transaction", "Payment"}]
    api_anoms = [e for e in anomalies if e.event_type == "API Request"]

    return {
        "totals": {
            "events": len(events),
            "anomalies": len(anomalies),
            "alerts": len(alerts),
            "critical_alerts": len(critical_alerts),
            "average_risk": round(
                sum(e.risk_score for e in events) / max(len(events), 1), 1
            ),
        },
        "top_risky_users": analytics_service.top_risky_users(db, 10),
        "top_risky_ips": analytics_service.top_risky_ips(db, 10),
        "alerts_by_severity": analytics_service.alerts_by_severity(db),
        "event_type_distribution": analytics_service.event_type_distribution(db),
        "transaction_anomaly_report": [
            {
                "event_id": e.event_id,
                "user_id": e.user_id,
                "amount": e.amount,
                "risk_score": e.risk_score,
                "location": e.location,
            }
            for e in tx_anoms[:25]
        ],
        "login_anomaly_report": [
            {
                "event_id": e.event_id,
                "user_id": e.user_id,
                "ip_address": e.ip_address,
                "status": e.status,
                "risk_score": e.risk_score,
            }
            for e in login_anoms[:25]
        ],
        "api_traffic_anomaly_report": [
            {
                "event_id": e.event_id,
                "user_id": e.user_id,
                "ip_address": e.ip_address,
                "risk_score": e.risk_score,
                "volume": (e.metadata_json or {}).get("api_request_volume"),
            }
            for e in api_anoms[:25]
        ],
        "critical_alerts_summary": [
            {
                "alert_id": a.alert_id,
                "title": a.title,
                "status": a.status,
                "risk_score": a.risk_score,
            }
            for a in critical_alerts[:25]
        ],
    }


async def generate_report(
    db: Session,
    report_type: str = "daily_summary",
    title: str | None = None,
) -> AnomalyReport:
    hours = 24 if report_type == "daily_summary" else 72
    data = collect_report_data(db, hours=hours)
    executive = await generate_report_summary(data)
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(hours=hours)
    summary = (
        f"{data['totals']['anomalies']} anomalies and "
        f"{data['totals']['critical_alerts']} critical alerts in the last {hours}h."
    )
    report = AnomalyReport(
        report_id=_new_report_id(),
        title=title or f"Anomaly Report — {period_end.strftime('%Y-%m-%d %H:%M')}",
        report_type=report_type,
        period_start=period_start,
        period_end=period_end,
        summary=summary,
        executive_summary=executive,
        data=data,
        created_at=datetime.utcnow(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
