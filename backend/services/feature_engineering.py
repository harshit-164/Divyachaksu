"""Feature engineering for anomaly detection."""

from typing import Any

import numpy as np

from utils.risk_utils import EVENT_TYPES

EVENT_TYPE_INDEX = {t: i for i, t in enumerate(EVENT_TYPES)}


def encode_event_type(event_type: str) -> int:
    return EVENT_TYPE_INDEX.get(event_type, 0)


def _meta(event: dict[str, Any], key: str, default: Any = 0) -> Any:
    meta = event.get("metadata_json") or event.get("metadata") or {}
    return meta.get(key, default)


def extract_transaction_features(event: dict[str, Any]) -> dict[str, float]:
    amount = float(event.get("amount") or 0)
    avg = float(_meta(event, "user_avg_amount", 50) or 50)
    return {
        "amount": amount,
        "amount_vs_avg": amount / max(avg, 1.0),
        "is_high_value": 1.0 if amount > avg * 5 else 0.0,
        "payment_failures": float(_meta(event, "payment_failures", 0)),
    }


def extract_login_features(event: dict[str, Any]) -> dict[str, float]:
    status = (event.get("status") or "").lower()
    return {
        "is_failed_login": 1.0 if status in {"failed", "failure", "denied"} else 0.0,
        "failed_login_count": float(_meta(event, "failed_login_count", 0)),
        "impossible_travel": 1.0 if _meta(event, "impossible_travel") else 0.0,
        "password_reset_count": float(_meta(event, "password_reset_count", 0)),
    }


def extract_api_features(event: dict[str, Any]) -> dict[str, float]:
    return {
        "api_request_volume": float(_meta(event, "api_request_volume", 1)),
        "api_error_rate": float(_meta(event, "api_error_rate", 0)),
        "burst_score": float(_meta(event, "burst_score", 0)),
    }


def extract_behavior_features(event: dict[str, Any]) -> dict[str, float]:
    hour = 12
    ts = event.get("timestamp")
    if hasattr(ts, "hour"):
        hour = ts.hour
    elif isinstance(ts, str) and "T" in ts:
        try:
            hour = int(ts.split("T")[1][:2])
        except Exception:
            hour = 12

    return {
        "event_type_encoded": float(encode_event_type(event.get("event_type") or "")),
        "hour_of_day": float(hour),
        "location_change": 1.0 if _meta(event, "location_change") else 0.0,
        "device_change": 1.0 if _meta(event, "device_change") else 0.0,
        "ip_repetition": float(_meta(event, "ip_repetition", 1)),
        "users_from_ip": float(_meta(event, "users_from_ip", 1)),
        "event_velocity": float(_meta(event, "event_velocity", 1)),
        "user_history_deviation": float(_meta(event, "user_history_deviation", 0)),
        "new_device": 1.0 if _meta(event, "new_device") else 0.0,
        "unusual_location": 1.0 if _meta(event, "unusual_location") else 0.0,
    }


FEATURE_ORDER = [
    "amount",
    "amount_vs_avg",
    "is_high_value",
    "payment_failures",
    "is_failed_login",
    "failed_login_count",
    "impossible_travel",
    "password_reset_count",
    "api_request_volume",
    "api_error_rate",
    "burst_score",
    "event_type_encoded",
    "hour_of_day",
    "location_change",
    "device_change",
    "ip_repetition",
    "users_from_ip",
    "event_velocity",
    "user_history_deviation",
    "new_device",
    "unusual_location",
]


def extract_all_features(event: dict[str, Any]) -> dict[str, float]:
    features: dict[str, float] = {}
    features.update(extract_transaction_features(event))
    features.update(extract_login_features(event))
    features.update(extract_api_features(event))
    features.update(extract_behavior_features(event))
    return features


def features_to_vector(features: dict[str, float]) -> np.ndarray:
    return np.array([[float(features.get(k, 0.0)) for k in FEATURE_ORDER]], dtype=float)


def normalize_features(features: dict[str, float]) -> dict[str, float]:
    """Light min-max style normalization for display / rules."""
    scales = {
        "amount": 5000.0,
        "amount_vs_avg": 20.0,
        "failed_login_count": 20.0,
        "password_reset_count": 10.0,
        "api_request_volume": 500.0,
        "ip_repetition": 50.0,
        "users_from_ip": 20.0,
        "event_velocity": 50.0,
        "hour_of_day": 24.0,
        "user_history_deviation": 10.0,
        "burst_score": 10.0,
        "payment_failures": 10.0,
        "api_error_rate": 1.0,
        "event_type_encoded": float(max(len(EVENT_TYPES) - 1, 1)),
    }
    out: dict[str, float] = {}
    for k, v in features.items():
        scale = scales.get(k, 1.0)
        out[k] = float(np.clip(v / scale, 0.0, 1.0)) if scale else float(v)
    return out
