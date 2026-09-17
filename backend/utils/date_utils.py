"""Date/time helpers."""

from datetime import datetime, timedelta
from typing import Optional


def utcnow() -> datetime:
    return datetime.utcnow()


def hours_ago(hours: int) -> datetime:
    return utcnow() - timedelta(hours=hours)


def days_ago(days: int) -> datetime:
    return utcnow() - timedelta(days=days)


def format_iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.isoformat() + "Z"


def bucket_label(dt: datetime, grain: str = "hour") -> str:
    if grain == "day":
        return dt.strftime("%Y-%m-%d")
    if grain == "minute":
        return dt.strftime("%H:%M")
    return dt.strftime("%m/%d %H:00")
