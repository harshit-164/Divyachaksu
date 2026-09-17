"""AI explanation service with Gemini API and realistic mock fallback."""

from __future__ import annotations

import json
import asyncio
from typing import Any, Optional

import httpx

from config import get_settings
from utils.risk_utils import summarize_factors

settings = get_settings()


def generate_mock_explanation(
    event: dict[str, Any],
    risk_score: int,
    risk_factors: list[Any],
) -> dict[str, Any]:
    event_type = event.get("event_type") or "Event"
    user_id = event.get("user_id") or "unknown"
    location = event.get("location") or "an uncommon location"
    ip = event.get("ip_address") or "an unrecognized IP"
    device = event.get("device") or "an unrecognized device"
    amount = event.get("amount")
    status = event.get("status") or "unknown"
    factor_names = summarize_factors(risk_factors)
    meta = event.get("metadata_json") or {}

    amount_text = f" for ${float(amount):,.2f}" if amount is not None else ""
    severity_tone = (
        "critical"
        if risk_score >= 90
        else "high"
        if risk_score >= 70
        else "moderate"
        if risk_score >= 40
        else "low"
    )

    templates = {
        "Login Attempt": {
            "what": (
                f"A {status} login attempt for {user_id} originated from {location} "
                f"({ip}) on {device}."
            ),
            "why": (
                "Authentication signals diverge from this account's recent baseline — "
                "failures, geography, device novelty, or velocity may be elevated."
            ),
            "impact": (
                "Successful account takeover could expose PII, enable unauthorized transfers, "
                "or create a foothold for further fraud."
            ),
            "response": (
                "Challenge the session with MFA, review contiguous login events, "
                "and suspend risky sessions only after confirming abuse indicators."
            ),
            "steps": [
                "Verify source IP reputation and geo consistency against recent successful logins.",
                "Check whether MFA was bypassed, reset, or newly enrolled.",
                "Inspect nearby password-reset or account-update events.",
                "Contact the customer only through trusted out-of-band channels if takeover is likely.",
            ],
        },
        "Transaction": {
            "what": (
                f"A transaction{amount_text} for {user_id} from {location} was flagged "
                f"with {severity_tone} risk."
            ),
            "why": (
                "Amount, velocity, device, or location deviate from the user's spending baseline."
            ),
            "impact": (
                "If fraudulent, the business faces direct loss, chargebacks, and merchant liability."
            ),
            "response": (
                "Hold settlement if policy allows, verify intent through approved channels, "
                "and document the investigation outcome."
            ),
            "steps": [
                "Compare amount against the user's rolling average and recent peers.",
                "Review device/IP continuity with prior accepted transactions.",
                "Check for rapid-fire transactions or card-testing patterns.",
                "Confirm whether related alerts already cover the same instrument or IP.",
            ],
        },
        "Payment": {
            "what": (
                f"A payment{amount_text} for {user_id} from {location} triggered risk controls."
            ),
            "why": (
                "Payment behavior shows unusual geography, repeated failures, "
                "or value far above normal."
            ),
            "impact": (
                "May indicate stolen payment credentials, mule activity, or account takeover cash-out."
            ),
            "response": (
                "Pause payout/settlement pending review and confirm instrument ownership "
                "via secure verification flows."
            ),
            "steps": [
                "Review preceding payment failures and whether success followed rapid retries.",
                "Validate billing location against shipping/account profile.",
                "Check for instrument sharing across multiple user IDs.",
                "Escalate to payments ops if amount exceeds critical thresholds.",
            ],
        },
        "API Request": {
            "what": (
                f"API activity for identity {user_id} from {ip} showed abnormal volume or burst behavior."
            ),
            "why": (
                f"Request volume "
                f"({meta.get('api_request_volume', 'elevated')}) or burst score exceeds expected patterns."
            ),
            "impact": (
                "Could indicate credential stuffing, scraping, abuse of public endpoints, "
                "or degraded service for legitimate customers."
            ),
            "response": (
                "Apply temporary rate limits, inspect API keys/tokens, and block confirmed abusive sources."
            ),
            "steps": [
                "Identify top endpoints hit during the spike.",
                "Correlate with auth failures and shared IPs.",
                "Confirm whether traffic is from a known integration partner.",
                "Tune WAF/rate-limit rules if the pattern repeats.",
            ],
        },
        "Password Reset": {
            "what": f"Password reset activity for {user_id} from {location} looks suspicious.",
            "why": (
                "Reset frequency or follow-on sensitive actions are atypical for this account."
            ),
            "impact": "Attacker-driven resets are a common account-takeover entry path.",
            "response": (
                "Require stronger identity proofing before completing reset and notify the account owner."
            ),
            "steps": [
                "Count resets in the last hour/day for this user and IP.",
                "Check whether a high-risk login or payment followed the reset.",
                "Invalidate outstanding reset tokens if abuse is confirmed.",
                "Advise the customer to secure email recovery channels.",
            ],
        },
        "Account Update": {
            "what": f"A sensitive account update for {user_id} was flagged by risk controls.",
            "why": (
                "Profile changes after risky authentication or from a new device/location "
                "elevate takeover concern."
            ),
            "impact": (
                "Attackers may redirect notifications, payouts, or recovery emails after hijacking an account."
            ),
            "response": (
                "Verify the change via a trusted channel and temporarily freeze further sensitive updates."
            ),
            "steps": [
                "Diff the changed fields (email, phone, payout destination).",
                "Correlate with prior high-risk login or reset events.",
                "Roll back unverified changes per policy.",
                "Increase monitoring on subsequent money-movement events.",
            ],
        },
        "System Event": {
            "what": "A system anomaly event was recorded by the monitoring pipeline.",
            "why": "Operational or security signals exceeded configured detection thresholds.",
            "impact": "May indicate instability, misconfiguration, or security-relevant misuse.",
            "response": (
                "Correlate with infrastructure metrics and security alerts, then triage severity."
            ),
            "steps": [
                "Confirm whether the event is customer-impacting.",
                "Check concurrent spikes across related services.",
                "Assign an owner in ops/security.",
                "Document mitigation and close or escalate the alert.",
            ],
        },
    }

    t = templates.get(event_type, templates["System Event"])
    why = t["why"]
    if factor_names:
        why = f"{why} Observed factors: {', '.join(factor_names[:6])}."

    summary = (
        f"Risk Radar scored this {event_type.lower()} at {risk_score}/100 ({severity_tone} risk) "
        f"for {user_id}. The pattern looks unusual relative to recent behavior. "
        "This is a defensive monitoring signal for investigation — not proof of fraud and not "
        "guidance for bypassing controls."
    )

    return {
        "what_happened": t["what"],
        "why_suspicious": why,
        "risk_factors": factor_names or ["Elevated ML anomaly signal"],
        "business_impact": t["impact"],
        "investigation_steps": t["steps"],
        "suggested_response": t["response"],
        "plain_english_summary": summary,
        "source": "risk-radar-engine",
    }


def generate_mock_report_summary(report_data: dict[str, Any]) -> str:
    totals = report_data.get("totals") or {}
    events = totals.get("events", 0)
    anomalies = totals.get("anomalies", 0)
    critical = totals.get("critical_alerts", 0)
    avg_risk = totals.get("average_risk", 0)
    top_users = report_data.get("top_risky_users") or []
    top_ips = report_data.get("top_risky_ips") or []
    lead_user = top_users[0]["user_id"] if top_users else "n/a"
    lead_ip = top_ips[0]["ip_address"] if top_ips else "n/a"
    return (
        f"Executive summary: Risk Radar processed {events} events and detected {anomalies} anomalies "
        f"(avg risk {avg_risk}) with {critical} critical alerts. "
        f"Risk concentrated around user {lead_user} and IP {lead_ip}. "
        "Recommended focus: clear open critical alerts, review high-value payment and failed-login clusters, "
        "and tune thresholds if false-positive volume rises. "
        "This report supports defensive investigation and operational risk reduction only."
    )


async def _call_gemini(prompt: str, *, expect_json: bool = True) -> Optional[str]:
    api_key = settings.gemini_api_key
    if not api_key:
        return None
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    system_instruction = (
        "You are a defensive fraud and anomaly investigation assistant for Risk Radar. "
        "Explain anomalies for SOC and payments analysts in clear business language. "
        "Focus on investigation and prevention. Never provide instructions for committing fraud "
        "or bypassing detection. "
        + (
            "Return valid JSON only with keys: what_happened, why_suspicious, risk_factors, "
            "business_impact, investigation_steps, suggested_response, plain_english_summary."
            if expect_json
            else "Return a concise executive summary paragraph only."
        )
    )
    body: dict[str, Any] = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.25},
    }
    if expect_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for attempt in range(3):
                resp = await client.post(url, params={"key": api_key}, json=body)
                if resp.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                    resp.raise_for_status()
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                await asyncio.sleep(0.75 * (2**attempt))
    except Exception:
        return None


def _parse_explanation_json(content: str, fallback: dict[str, Any]) -> dict[str, Any]:
    try:
        raw = content.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        out = {**fallback, **parsed, "source": "gemini"}
        if isinstance(out.get("risk_factors"), str):
            out["risk_factors"] = [out["risk_factors"]]
        if isinstance(out.get("investigation_steps"), str):
            out["investigation_steps"] = [out["investigation_steps"]]
        return out
    except Exception:
        return fallback


async def generate_anomaly_explanation(
    event: dict[str, Any],
    risk_score: int,
    risk_factors: list[Any],
) -> dict[str, Any]:
    mock = generate_mock_explanation(event, risk_score, risk_factors)
    if not settings.gemini_api_key:
        return mock

    prompt = (
        f"Event: {json.dumps(event, default=str)}\n"
        f"Risk score: {risk_score}\n"
        f"Risk factors: {json.dumps(risk_factors, default=str)}\n"
        "Produce a defensive investigation explanation as JSON."
    )
    content = await _call_gemini(prompt, expect_json=True)
    if not content:
        return mock
    return _parse_explanation_json(content, mock)


async def generate_report_summary(report_data: dict[str, Any]) -> str:
    mock = generate_mock_report_summary(report_data)
    if not settings.gemini_api_key:
        return mock
    prompt = (
        "Write a short executive summary for a fraud/anomaly monitoring report. "
        f"Data: {json.dumps(report_data, default=str)[:6000]}"
    )
    content = await _call_gemini(prompt, expect_json=False)
    return (content or "").strip() or mock
