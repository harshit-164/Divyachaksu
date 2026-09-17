"""Analytics aggregation helpers."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Alert, Event
from utils.date_utils import bucket_label


def _events_in_window(db: Session, hours: int = 72) -> list[Event]:
    since = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(Event)
        .filter(Event.timestamp >= since)
        .order_by(Event.timestamp.asc())
        .all()
    )


def events_over_time(db: Session, hours: int = 48) -> list[dict[str, Any]]:
    events = _events_in_window(db, hours)
    buckets: Counter = Counter()
    for e in events:
        buckets[bucket_label(e.timestamp, "hour")] += 1
    return [{"label": k, "value": v} for k, v in sorted(buckets.items())]


def anomalies_over_time(db: Session, hours: int = 48) -> list[dict[str, Any]]:
    events = _events_in_window(db, hours)
    buckets: Counter = Counter()
    for e in events:
        if e.is_anomaly:
            buckets[bucket_label(e.timestamp, "hour")] += 1
    return [{"label": k, "value": v} for k, v in sorted(buckets.items())]


def risk_distribution(db: Session) -> list[dict[str, Any]]:
    rows = (
        db.query(Event.risk_level, func.count(Event.id))
        .group_by(Event.risk_level)
        .all()
    )
    order = ["Low", "Medium", "High", "Critical"]
    mapping = {r[0]: r[1] for r in rows}
    return [{"name": level, "value": mapping.get(level, 0)} for level in order]


def alerts_by_severity(db: Session) -> list[dict[str, Any]]:
    rows = (
        db.query(Alert.severity, func.count(Alert.id))
        .group_by(Alert.severity)
        .all()
    )
    order = ["Low", "Medium", "High", "Critical"]
    mapping = {r[0]: r[1] for r in rows}
    return [{"name": level, "value": mapping.get(level, 0)} for level in order]


def event_type_distribution(db: Session) -> list[dict[str, Any]]:
    rows = (
        db.query(Event.event_type, func.count(Event.id))
        .group_by(Event.event_type)
        .all()
    )
    return [{"name": r[0], "value": r[1]} for r in rows]


def top_risky_users(db: Session, limit: int = 10) -> list[dict[str, Any]]:
    events = db.query(Event).all()
    agg: dict[str, dict[str, Any]] = defaultdict(lambda: {"sum": 0, "count": 0, "anomalies": 0})
    for e in events:
        a = agg[e.user_id]
        a["sum"] += e.risk_score or 0
        a["count"] += 1
        a["anomalies"] += 1 if e.is_anomaly else 0
    ranked = sorted(
        (
            {
                "user_id": uid,
                "average_risk": round(v["sum"] / max(v["count"], 1), 1),
                "events": v["count"],
                "anomalies": v["anomalies"],
            }
            for uid, v in agg.items()
        ),
        key=lambda x: x["average_risk"],
        reverse=True,
    )
    return ranked[:limit]


def top_risky_ips(db: Session, limit: int = 10) -> list[dict[str, Any]]:
    events = db.query(Event).filter(Event.ip_address.isnot(None)).all()
    agg: dict[str, dict[str, Any]] = defaultdict(lambda: {"sum": 0, "count": 0, "anomalies": 0})
    for e in events:
        a = agg[e.ip_address]
        a["sum"] += e.risk_score or 0
        a["count"] += 1
        a["anomalies"] += 1 if e.is_anomaly else 0
    ranked = sorted(
        (
            {
                "ip_address": ip,
                "average_risk": round(v["sum"] / max(v["count"], 1), 1),
                "events": v["count"],
                "anomalies": v["anomalies"],
            }
            for ip, v in agg.items()
        ),
        key=lambda x: x["average_risk"],
        reverse=True,
    )
    return ranked[:limit]


def failed_login_trend(db: Session, hours: int = 48) -> list[dict[str, Any]]:
    since = datetime.utcnow() - timedelta(hours=hours)
    events = (
        db.query(Event)
        .filter(
            Event.timestamp >= since,
            Event.event_type == "Login Attempt",
            Event.status.in_(["failed", "failure", "denied"]),
        )
        .all()
    )
    buckets: Counter = Counter()
    for e in events:
        buckets[bucket_label(e.timestamp, "hour")] += 1
    return [{"label": k, "value": v} for k, v in sorted(buckets.items())]


def transaction_amount_anomalies(db: Session, limit: int = 30) -> list[dict[str, Any]]:
    rows = (
        db.query(Event)
        .filter(
            Event.event_type.in_(["Transaction", "Payment"]),
            Event.is_anomaly.is_(True),
            Event.amount.isnot(None),
        )
        .order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "label": e.timestamp.strftime("%m/%d %H:%M"),
            "value": e.amount or 0,
            "risk_score": e.risk_score,
            "user_id": e.user_id,
        }
        for e in reversed(rows)
    ]
