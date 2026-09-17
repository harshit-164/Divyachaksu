"""Isolation Forest anomaly detection with StandardScaler pipeline."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from config import get_settings
from services.feature_engineering import (
    FEATURE_ORDER,
    extract_all_features,
    features_to_vector,
    normalize_features,
)

settings = get_settings()

_model: Optional[IsolationForest] = None
_scaler: Optional[StandardScaler] = None
_model_meta: dict[str, Any] = {
    "model_type": "IsolationForest",
    "training_data_size": 0,
    "last_trained": None,
    "model_threshold": 0.55,
    "is_trained": False,
    "anomaly_rate_in_train": 0.0,
}


def _resolve_model_path() -> Path:
    path = Path(settings.model_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def generate_synthetic_training_data(n_normal: int = 1000, n_anomaly: int = 150) -> np.ndarray:
    """Generate diverse normal vs anomalous feature rows for Isolation Forest."""
    rng = np.random.default_rng(42)
    rows = []

    for _ in range(n_normal):
        row = {
            "amount": float(rng.uniform(5, 420)),
            "amount_vs_avg": float(rng.uniform(0.25, 2.2)),
            "is_high_value": 0.0,
            "payment_failures": float(rng.integers(0, 2)),
            "is_failed_login": float(rng.choice([0, 1], p=[0.93, 0.07])),
            "failed_login_count": float(rng.integers(0, 3)),
            "impossible_travel": 0.0,
            "password_reset_count": float(rng.integers(0, 2)),
            "api_request_volume": float(rng.integers(1, 45)),
            "api_error_rate": float(rng.uniform(0, 0.06)),
            "burst_score": float(rng.uniform(0, 1.8)),
            "event_type_encoded": float(rng.integers(0, 7)),
            "hour_of_day": float(rng.integers(7, 22)),
            "location_change": float(rng.choice([0, 1], p=[0.9, 0.1])),
            "device_change": float(rng.choice([0, 1], p=[0.88, 0.12])),
            "ip_repetition": float(rng.integers(1, 5)),
            "users_from_ip": float(rng.integers(1, 3)),
            "event_velocity": float(rng.integers(1, 8)),
            "user_history_deviation": float(rng.uniform(0, 1.6)),
            "new_device": float(rng.choice([0, 1], p=[0.9, 0.1])),
            "unusual_location": float(rng.choice([0, 1], p=[0.93, 0.07])),
        }
        rows.append([row[k] for k in FEATURE_ORDER])

    anomaly_patterns = [
        # High-value payment / transaction
        lambda r: {
            "amount": float(r.uniform(2200, 14000)),
            "amount_vs_avg": float(r.uniform(7, 28)),
            "is_high_value": 1.0,
            "payment_failures": float(r.integers(0, 4)),
            "unusual_location": 1.0,
            "new_device": 1.0,
            "user_history_deviation": float(r.uniform(4, 12)),
            "hour_of_day": float(r.choice([1, 2, 3, 4, 23])),
        },
        # Failed login burst
        lambda r: {
            "is_failed_login": 1.0,
            "failed_login_count": float(r.integers(7, 22)),
            "ip_repetition": float(r.integers(14, 55)),
            "event_velocity": float(r.integers(18, 70)),
            "burst_score": float(r.uniform(4, 10)),
        },
        # API spike
        lambda r: {
            "api_request_volume": float(r.integers(140, 650)),
            "api_error_rate": float(r.uniform(0.12, 0.75)),
            "burst_score": float(r.uniform(5, 10)),
            "event_velocity": float(r.integers(25, 80)),
        },
        # Shared IP / carding-like pattern
        lambda r: {
            "users_from_ip": float(r.integers(6, 24)),
            "ip_repetition": float(r.integers(18, 60)),
            "event_velocity": float(r.integers(12, 40)),
            "amount": float(r.uniform(200, 2200)),
            "amount_vs_avg": float(r.uniform(3, 12)),
        },
        # Impossible travel + reset
        lambda r: {
            "impossible_travel": 1.0,
            "location_change": 1.0,
            "unusual_location": 1.0,
            "device_change": 1.0,
            "new_device": 1.0,
            "password_reset_count": float(r.integers(3, 10)),
            "user_history_deviation": float(r.uniform(5, 11)),
        },
    ]

    for i in range(n_anomaly):
        base = {
            "amount": float(rng.uniform(50, 800)),
            "amount_vs_avg": float(rng.uniform(1, 4)),
            "is_high_value": 0.0,
            "payment_failures": float(rng.integers(0, 3)),
            "is_failed_login": 0.0,
            "failed_login_count": float(rng.integers(0, 4)),
            "impossible_travel": 0.0,
            "password_reset_count": float(rng.integers(0, 2)),
            "api_request_volume": float(rng.integers(5, 60)),
            "api_error_rate": float(rng.uniform(0, 0.1)),
            "burst_score": float(rng.uniform(1, 3)),
            "event_type_encoded": float(rng.integers(0, 7)),
            "hour_of_day": float(rng.integers(0, 24)),
            "location_change": 0.0,
            "device_change": 0.0,
            "ip_repetition": float(rng.integers(3, 10)),
            "users_from_ip": float(rng.integers(1, 4)),
            "event_velocity": float(rng.integers(5, 15)),
            "user_history_deviation": float(rng.uniform(1, 3)),
            "new_device": 0.0,
            "unusual_location": 0.0,
        }
        base.update(anomaly_patterns[i % len(anomaly_patterns)](rng))
        rows.append([base[k] for k in FEATURE_ORDER])

    return np.array(rows, dtype=float)


def train_isolation_forest(training_data: Optional[np.ndarray] = None) -> IsolationForest:
    global _model, _scaler, _model_meta
    if training_data is None:
        training_data = generate_synthetic_training_data()

    scaler = StandardScaler()
    scaled = scaler.fit_transform(training_data)

    contamination = min(0.18, max(0.08, 150 / max(len(training_data), 1)))
    model = IsolationForest(
        n_estimators=250,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(scaled)
    _scaler = scaler
    _model = model
    _model_meta = {
        "model_type": "IsolationForest + StandardScaler",
        "training_data_size": int(len(training_data)),
        "last_trained": datetime.utcnow(),
        "model_threshold": 0.55,
        "is_trained": True,
        "anomaly_rate_in_train": round(contamination, 3),
    }
    save_model()
    return model


def save_model() -> None:
    path = _resolve_model_path()
    joblib.dump({"model": _model, "scaler": _scaler, "meta": _model_meta}, path)


def load_model() -> Optional[IsolationForest]:
    global _model, _scaler, _model_meta
    path = _resolve_model_path()
    if not path.exists():
        return None
    payload = joblib.load(path)
    _model = payload.get("model")
    _scaler = payload.get("scaler")
    _model_meta = payload.get("meta") or _model_meta
    return _model


def ensure_model() -> IsolationForest:
    global _model
    if _model is not None and _scaler is not None:
        return _model
    loaded = load_model()
    if loaded is not None and _scaler is not None:
        return loaded
    return train_isolation_forest()


def extract_features(event_data: dict[str, Any]) -> dict[str, float]:
    return extract_all_features(event_data)


def calculate_anomaly_score(features: dict[str, float]) -> float:
    """Return anomaly score in [0, 1] where higher = more anomalous."""
    model = ensure_model()
    vector = features_to_vector(features)
    if _scaler is not None:
        vector = _scaler.transform(vector)
    raw = float(model.decision_function(vector)[0])
    anomaly = 1.0 / (1.0 + np.exp(raw * 6.0))
    pred = int(model.predict(vector)[0])
    if pred == -1:
        anomaly = max(anomaly, 0.58)
    return float(np.clip(anomaly, 0.0, 1.0))


def predict_anomaly(event_data: dict[str, Any]) -> dict[str, Any]:
    features = extract_features(event_data)
    normalized = normalize_features(features)
    score = calculate_anomaly_score(features)
    threshold = float(_model_meta.get("model_threshold", 0.55))
    model = ensure_model()
    vector = features_to_vector(features)
    if _scaler is not None:
        vector = _scaler.transform(vector)
    decision = float(model.decision_function(vector)[0])
    is_anomaly = score >= threshold
    return {
        "features": features,
        "normalized_features": normalized,
        "anomaly_score": round(score, 4),
        "decision_function": round(decision, 4),
        "is_anomaly": bool(is_anomaly),
        "model_type": _model_meta.get("model_type", "IsolationForest"),
        "threshold": threshold,
    }


def get_model_status() -> dict[str, Any]:
    ensure_model()
    # Heuristic importance for portfolio display (Isolation Forest lacks native importances)
    weights = {
        "amount": 0.11,
        "amount_vs_avg": 0.12,
        "failed_login_count": 0.13,
        "api_request_volume": 0.10,
        "event_velocity": 0.09,
        "users_from_ip": 0.08,
        "impossible_travel": 0.09,
        "unusual_location": 0.07,
        "ip_repetition": 0.07,
        "user_history_deviation": 0.06,
    }
    feature_importance = [
        {"name": name, "value": weights.get(name, round(0.04 + (i % 3) * 0.01, 3))}
        for i, name in enumerate(FEATURE_ORDER[:10])
    ]
    feature_importance.sort(key=lambda x: x["value"], reverse=True)
    return {
        **_model_meta,
        "feature_importance": feature_importance,
        "false_positive_count": 0,
        "true_positive_placeholder": 0,
        "average_anomaly_score": 0.0,
    }


def set_model_threshold(threshold: float) -> dict[str, Any]:
    global _model_meta
    ensure_model()
    _model_meta["model_threshold"] = float(np.clip(threshold, 0.3, 0.9))
    save_model()
    return get_model_status()


def rule_based_anomaly_fallback(event_data: dict[str, Any], features: dict[str, float]) -> float:
    score = 0.12
    if features.get("is_high_value", 0) > 0:
        score += 0.28
    if features.get("failed_login_count", 0) >= 5:
        score += 0.32
    if features.get("impossible_travel", 0) > 0:
        score += 0.22
    if features.get("api_request_volume", 0) > 100:
        score += 0.22
    if features.get("users_from_ip", 0) >= 5:
        score += 0.2
    if features.get("unusual_location", 0) > 0 and features.get("new_device", 0) > 0:
        score += 0.16
    if features.get("payment_failures", 0) >= 3:
        score += 0.14
    if features.get("password_reset_count", 0) >= 3:
        score += 0.14
    return float(np.clip(score, 0.0, 1.0))
