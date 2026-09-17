"""Risk scoring engine combining ML and defensive business rules."""

from typing import Any

from utils.risk_utils import clamp_risk_score, classify_risk_level


def detect_rule_triggers(event: dict[str, Any]) -> list[dict[str, Any]]:
    meta = event.get("metadata_json") or {}
    triggers: list[dict[str, Any]] = []
    amount = float(event.get("amount") or 0)
    avg = float(meta.get("user_avg_amount") or 50)
    status = (event.get("status") or "").lower()
    event_type = event.get("event_type") or ""

    def add(code: str, name: str, weight: float, detail: str):
        triggers.append({"code": code, "name": name, "weight": weight, "detail": detail})

    if amount >= max(avg * 8, 1500):
        add(
            "HIGH_AMOUNT",
            "High transaction amount",
            18,
            f"Amount ${amount:,.2f} is well above typical user average (${avg:,.2f}).",
        )
    if amount >= avg * 4 and amount < max(avg * 8, 1500) and event_type in {"Transaction", "Payment"}:
        add(
            "ELEVATED_AMOUNT",
            "Elevated amount vs baseline",
            10,
            f"Amount ${amount:,.2f} is {amount / max(avg, 1):.1f}x user average.",
        )

    failed_count = float(meta.get("failed_login_count") or 0)
    if failed_count >= 8 or (
        event_type == "Login Attempt"
        and status in {"failed", "failure", "denied"}
        and failed_count >= 5
    ):
        add(
            "FAILED_LOGINS",
            "Repeated failed logins",
            22,
            f"{int(failed_count)} failed authentication attempts detected from related activity.",
        )
    elif failed_count >= 3 and event_type == "Login Attempt":
        add(
            "LOGIN_FRICTION",
            "Elevated login failures",
            12,
            f"{int(failed_count)} recent failures — possible credential testing.",
        )

    if meta.get("unusual_location"):
        add(
            "UNUSUAL_LOCATION",
            "Unusual location",
            14,
            f"Location {event.get('location') or 'unknown'} is atypical for this user.",
        )
    if meta.get("new_device"):
        add(
            "NEW_DEVICE",
            "New device",
            10,
            f"Device {event.get('device') or 'unknown'} has not been seen in the recent baseline.",
        )
    if float(meta.get("ip_repetition") or 0) >= 12:
        add(
            "IP_PATTERN",
            "Suspicious IP pattern",
            16,
            "High event repetition from the same IP address.",
        )
    if float(meta.get("event_velocity") or 0) >= 15:
        add(
            "HIGH_VELOCITY",
            "High event velocity",
            14,
            "Unusually rapid successive activity in a short window.",
        )
    if float(meta.get("users_from_ip") or 0) >= 5:
        add(
            "SHARED_IP",
            "Multiple users from same IP",
            18,
            "Same IP observed across many distinct accounts.",
        )
    if float(meta.get("payment_failures") or 0) >= 3:
        add(
            "PAYMENT_FAILS",
            "Payment failure repetition",
            12,
            "Multiple payment failures preceding a successful attempt.",
        )
    if meta.get("account_change_after_risky_login"):
        add(
            "ACCOUNT_CHANGE",
            "Account change after risky login",
            18,
            "Sensitive profile update followed an elevated-risk authentication.",
        )
    if float(meta.get("api_request_volume") or 0) >= 100:
        add(
            "API_SPIKE",
            "API request spike",
            15,
            "API volume spike consistent with automation or abuse.",
        )
    if meta.get("impossible_travel"):
        add(
            "IMPOSSIBLE_TRAVEL",
            "Impossible travel pattern",
            24,
            "Consecutive locations imply travel that is not physically plausible.",
        )
    if event_type == "Password Reset" and float(meta.get("password_reset_count") or 0) >= 3:
        add(
            "RESET_BURST",
            "Password reset burst",
            14,
            "Too many password reset attempts in a short period.",
        )
    if meta.get("location_change") and meta.get("device_change"):
        add(
            "GEO_DEVICE_FLIP",
            "Location and device change together",
            11,
            "Simultaneous geography and device shift raises takeover concern.",
        )

    return triggers


def get_recommended_action(risk_level: str, event_type: str, risk_factors: list[Any]) -> str:
    actions = {
        "Critical": (
            "Escalate to the fraud queue immediately. Freeze high-risk money movement, "
            "require step-up verification, and open an investigation ticket."
        ),
        "High": (
            "Open an investigation within SLA, notify the on-call analyst, "
            "and temporarily increase monitoring sensitivity for this user/IP."
        ),
        "Medium": (
            "Flag for analyst review, compare against the user baseline, "
            "and monitor for repeat signals in the next activity window."
        ),
        "Low": "Log for trend analysis. No immediate intervention required.",
    }
    base = actions.get(risk_level, actions["Medium"])
    factor_codes = {
        (f.get("code") if isinstance(f, dict) else None) for f in (risk_factors or [])
    }

    if event_type in {"Transaction", "Payment"} and risk_level in {"High", "Critical"}:
        return f"{base} Hold settlement pending customer verification through approved channels."
    if event_type == "Login Attempt" and risk_level in {"High", "Critical"}:
        return f"{base} Challenge the session and require MFA re-enrollment confirmation."
    if event_type == "API Request" and risk_level in {"High", "Critical"}:
        return f"{base} Apply temporary rate limits and rotate or inspect API credentials."
    if "IMPOSSIBLE_TRAVEL" in factor_codes:
        return f"{base} Verify recent travel claims with the account owner before clearing."
    if "SHARED_IP" in factor_codes:
        return f"{base} Review linked accounts sharing this IP for coordinated abuse."
    return base


def calculate_risk_score(
    event: dict[str, Any],
    anomaly_score: float,
    rule_triggers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    triggers = rule_triggers if rule_triggers is not None else detect_rule_triggers(event)
    rule_points = sum(float(t.get("weight") or 0) for t in triggers)
    ml_points = float(anomaly_score) * 70.0
    raw = ml_points + min(rule_points, 48)

    if anomaly_score >= 0.55 and triggers:
        raw += 8
    if anomaly_score >= 0.75 and len(triggers) >= 2:
        raw += 6

    score = clamp_risk_score(raw if raw > 0 else 5)

    if anomaly_score < 0.35 and not triggers:
        score = clamp_risk_score(min(score, 28))
    if anomaly_score >= 0.7 and score < 70 and triggers:
        score = clamp_risk_score(max(score, 72))
    if any(t.get("code") == "IMPOSSIBLE_TRAVEL" for t in triggers) and score < 80:
        score = clamp_risk_score(max(score, 82))

    level = classify_risk_level(score)
    factors = [
        {
            "code": t["code"],
            "name": t["name"],
            "detail": t.get("detail"),
            "weight": t.get("weight"),
        }
        for t in triggers
    ]
    if anomaly_score >= 0.55:
        factors.append(
            {
                "code": "ML_ANOMALY",
                "name": "ML anomaly signal",
                "detail": f"Isolation Forest anomaly likelihood {anomaly_score:.2f}",
                "weight": round(anomaly_score * 20, 1),
            }
        )

    return {
        "risk_score": score,
        "risk_level": level,
        "risk_factors": factors,
        "rule_triggers": triggers,
        "ml_anomaly_score": round(float(anomaly_score), 4),
        "recommended_action": get_recommended_action(
            level, event.get("event_type") or "", factors
        ),
    }


__all__ = [
    "calculate_risk_score",
    "classify_risk_level",
    "detect_rule_triggers",
    "get_recommended_action",
]
