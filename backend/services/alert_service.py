"""Alert creation and lifecycle helpers."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from models import Alert, AnalystNote, Event, Settings as AppSettings
from utils.risk_utils import severity_from_risk


def _new_alert_id() -> str:
    return f"ALT-{uuid.uuid4().hex[:10].upper()}"


def resolve_alert_threshold(db: Optional[Session] = None, fallback: int = 70) -> int:
    """High/Critical alerts: use max(configured risk_threshold, 70) unless overridden."""
    if db is None:
        return fallback
    settings = db.query(AppSettings).first()
    if not settings:
        return fallback
    # Keep High/Critical bar at least 70 for portfolio clarity
    return max(int(settings.risk_threshold or fallback), 70)


def should_create_alert(risk_score: int, risk_level: str, threshold: int = 70) -> bool:
    return risk_score >= threshold or risk_level in {"High", "Critical"}


def build_alert_payload(event: Event, risk_result: dict[str, Any]) -> dict[str, Any]:
    severity = severity_from_risk(risk_result["risk_level"])
    title = f"{severity}: {event.event_type} anomaly for {event.user_id}"
    factors = ", ".join(
        f.get("name", str(f)) if isinstance(f, dict) else str(f)
        for f in (risk_result.get("risk_factors") or [])[:4]
    )
    description = (
        f"Detected anomalous {event.event_type.lower()} with risk score "
        f"{risk_result['risk_score']}. Factors: {factors or 'ML anomaly signal'}."
    )
    return {
        "alert_id": _new_alert_id(),
        "event_id": event.id,
        "alert_type": event.event_type,
        "severity": severity,
        "title": title,
        "description": description,
        "risk_score": risk_result["risk_score"],
        "status": "Open",
        "assigned_to": None,
        "recommended_action": risk_result.get("recommended_action"),
        "created_at": datetime.utcnow(),
    }


def create_alert_from_event(
    db: Session,
    event: Event,
    risk_result: dict[str, Any],
    threshold: Optional[int] = None,
) -> Optional[Alert]:
    cutoff = threshold if threshold is not None else resolve_alert_threshold(db)
    if not should_create_alert(event.risk_score, event.risk_level, cutoff):
        return None

    # Avoid duplicate open alerts for the same event
    existing = (
        db.query(Alert)
        .filter(Alert.event_id == event.id, Alert.status.in_(["Open", "Investigating"]))
        .first()
    )
    if existing:
        return existing

    payload = build_alert_payload(event, risk_result)
    alert = Alert(**payload)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def update_alert_status(
    db: Session,
    alert: Alert,
    status: str,
    assigned_to: Optional[str] = None,
) -> Alert:
    allowed = {"Open", "Investigating", "Resolved", "False Positive"}
    if status not in allowed:
        raise ValueError(f"Invalid status: {status}")
    alert.status = status
    if assigned_to is not None:
        alert.assigned_to = assigned_to
    if status in {"Resolved", "False Positive"}:
        alert.resolved_at = datetime.utcnow()
    elif status in {"Open", "Investigating"}:
        alert.resolved_at = None
    db.commit()
    db.refresh(alert)
    return alert


def add_note(
    db: Session,
    alert: Alert,
    note: str,
    author_name: str = "Analyst",
    author_id: Optional[int] = None,
) -> AnalystNote:
    row = AnalystNote(
        alert_id=alert.id,
        author_id=author_id,
        author_name=author_name,
        note=note.strip(),
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def alert_to_dict(alert: Alert) -> dict[str, Any]:
    return {
        "id": alert.id,
        "alert_id": alert.alert_id,
        "event_id": alert.event_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "title": alert.title,
        "description": alert.description,
        "risk_score": alert.risk_score,
        "status": alert.status,
        "assigned_to": alert.assigned_to,
        "recommended_action": alert.recommended_action,
        "created_at": alert.created_at,
        "resolved_at": alert.resolved_at,
    }
