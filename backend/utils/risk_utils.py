"""Risk classification helpers."""

from typing import Any


RISK_LEVELS = {
    "Low": (1, 39),
    "Medium": (40, 69),
    "High": (70, 89),
    "Critical": (90, 100),
}

SEVERITY_ORDER = ["Low", "Medium", "High", "Critical"]

EVENT_TYPES = [
    "Transaction",
    "Login Attempt",
    "Payment",
    "API Request",
    "Account Update",
    "Password Reset",
    "System Event",
]


def classify_risk_level(score: int) -> str:
    score = max(1, min(100, int(score)))
    if score >= 90:
        return "Critical"
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def clamp_risk_score(score: float) -> int:
    return max(1, min(100, int(round(score))))


def severity_from_risk(risk_level: str) -> str:
    return risk_level if risk_level in SEVERITY_ORDER else "Medium"


def risk_color(level: str) -> str:
    return {
        "Critical": "#DC2626",
        "High": "#EA580C",
        "Medium": "#F59E0B",
        "Low": "#10B981",
    }.get(level, "#64748B")


def summarize_factors(factors: list[Any]) -> list[str]:
    out = []
    for f in factors or []:
        if isinstance(f, dict):
            out.append(f.get("name") or f.get("code") or str(f))
        else:
            out.append(str(f))
    return out
