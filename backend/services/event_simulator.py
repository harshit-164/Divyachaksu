"""Background event simulator for realistic + anomalous events."""

from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Event, ModelPrediction, Settings as AppSettings, SimulationStatus, UserRiskProfile
from services.alert_service import alert_to_dict, create_alert_from_event
from services.ai_explanation_service import generate_mock_explanation
from services.anomaly_model import predict_anomaly, rule_based_anomaly_fallback
from services.risk_scoring_service import calculate_risk_score
from services.websocket_manager import manager
from utils.risk_utils import EVENT_TYPES

LOCATIONS = [
    "New York, US",
    "London, UK",
    "Berlin, DE",
    "Toronto, CA",
    "São Paulo, BR",
    "Singapore, SG",
    "Sydney, AU",
    "Lagos, NG",
    "Mumbai, IN",
    "Dubai, AE",
    "Unknown Region",
]

DEVICES = [
    "Chrome/Windows",
    "Safari/iOS",
    "Firefox/Linux",
    "Edge/Windows",
    "Mobile Android",
    "API Client",
    "Unknown Device",
]

USER_IDS = [f"USR-{i:04d}" for i in range(1, 41)]
_rng = random.Random(42)
IPS = [f"203.0.{_rng.randint(0, 200)}.{_rng.randint(1, 254)}" for _ in range(60)]


class EventSimulator:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._lock = asyncio.Lock()

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self) -> dict[str, Any]:
        async with self._lock:
            if self._running:
                return self.get_status()
            self._running = True
            db = SessionLocal()
            try:
                status = db.query(SimulationStatus).first()
                if not status:
                    status = SimulationStatus(is_running=True)
                    db.add(status)
                status.is_running = True
                status.started_at = datetime.utcnow()
                status.stopped_at = None
                status.updated_at = datetime.utcnow()
                db.commit()
                payload = self._status_dict(status)
            finally:
                db.close()
            self._task = asyncio.create_task(self._loop())
            await manager.broadcast_simulation_status(payload)
            return payload

    async def stop(self) -> dict[str, Any]:
        async with self._lock:
            self._running = False
            if self._task:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
                self._task = None
            db = SessionLocal()
            try:
                status = db.query(SimulationStatus).first()
                if status:
                    status.is_running = False
                    status.stopped_at = datetime.utcnow()
                    status.updated_at = datetime.utcnow()
                    db.commit()
                    payload = self._status_dict(status)
                else:
                    payload = {
                        "is_running": False,
                        "events_generated": 0,
                        "anomalies_injected": 0,
                        "interval_ms": 1500,
                        "anomaly_rate": 0.18,
                    }
            finally:
                db.close()
            await manager.broadcast_simulation_status(payload)
            return payload

    def get_status(self) -> dict[str, Any]:
        db = SessionLocal()
        try:
            status = db.query(SimulationStatus).first()
            if not status:
                return {
                    "is_running": False,
                    "events_generated": 0,
                    "anomalies_injected": 0,
                    "interval_ms": 1500,
                    "anomaly_rate": 0.18,
                }
            return self._status_dict(status)
        finally:
            db.close()

    def _status_dict(self, status: SimulationStatus) -> dict[str, Any]:
        return {
            "is_running": bool(status.is_running and self._running),
            "events_generated": status.events_generated or 0,
            "anomalies_injected": status.anomalies_injected or 0,
            "interval_ms": status.interval_ms or 1500,
            "anomaly_rate": status.anomaly_rate or 0.18,
            "last_event_at": status.last_event_at,
            "started_at": status.started_at,
            "stopped_at": status.stopped_at,
        }

    async def _loop(self) -> None:
        while self._running:
            try:
                await self._produce_one()
            except asyncio.CancelledError:
                break
            except Exception:
                # Keep simulator alive on transient errors
                await asyncio.sleep(1.0)
                continue
            db = SessionLocal()
            try:
                settings = db.query(AppSettings).first()
                status = db.query(SimulationStatus).first()
                interval_ms = (
                    (settings.event_simulation_speed if settings else None)
                    or (status.interval_ms if status else None)
                    or 1500
                )
            finally:
                db.close()
            await asyncio.sleep(max(interval_ms, 300) / 1000.0)

    def _build_raw_event(self, force_anomaly: bool) -> dict[str, Any]:
        event_type = random.choice(EVENT_TYPES)
        user_id = random.choice(USER_IDS)
        ip = random.choice(IPS)
        location = random.choice(LOCATIONS)
        device = random.choice(DEVICES)
        amount = None
        status = "success"
        meta: dict[str, Any] = {
            "user_avg_amount": random.uniform(35, 180),
            "failed_login_count": 0,
            "api_request_volume": random.randint(1, 30),
            "event_velocity": random.randint(1, 6),
            "ip_repetition": random.randint(1, 4),
            "users_from_ip": random.randint(1, 2),
            "payment_failures": 0,
            "password_reset_count": 0,
        }

        if event_type in {"Transaction", "Payment"}:
            amount = round(random.uniform(8, 350), 2)
        if event_type == "Login Attempt":
            status = random.choices(["success", "failed"], weights=[0.9, 0.1])[0]

        if force_anomaly:
            scenario = random.choice(
                [
                    "high_value",
                    "failed_logins",
                    "unusual_location_payment",
                    "api_spike",
                    "reset_burst",
                    "shared_ip",
                    "impossible_travel",
                    "volume_spike",
                    "payment_fail_then_success",
                    "account_after_risky",
                ]
            )
            if scenario == "high_value":
                event_type = random.choice(["Transaction", "Payment"])
                meta["user_avg_amount"] = 60
                amount = round(random.uniform(2500, 9800), 2)
                meta["unusual_location"] = True
                meta["new_device"] = True
                location = "Unknown Region"
                device = "Unknown Device"
            elif scenario == "failed_logins":
                event_type = "Login Attempt"
                status = "failed"
                meta["failed_login_count"] = random.randint(8, 15)
                meta["ip_repetition"] = random.randint(12, 30)
                meta["event_velocity"] = random.randint(18, 40)
            elif scenario == "unusual_location_payment":
                event_type = "Payment"
                amount = round(random.uniform(800, 4200), 2)
                meta["unusual_location"] = True
                meta["location_change"] = True
                location = random.choice(["Lagos, NG", "Unknown Region", "Dubai, AE"])
            elif scenario == "api_spike":
                event_type = "API Request"
                meta["api_request_volume"] = random.randint(150, 500)
                meta["burst_score"] = random.uniform(5, 10)
                meta["event_velocity"] = random.randint(25, 70)
            elif scenario == "reset_burst":
                event_type = "Password Reset"
                meta["password_reset_count"] = random.randint(4, 9)
                meta["event_velocity"] = random.randint(10, 25)
            elif scenario == "shared_ip":
                event_type = random.choice(["Login Attempt", "Transaction"])
                meta["users_from_ip"] = random.randint(6, 18)
                meta["ip_repetition"] = random.randint(20, 50)
                if event_type == "Transaction":
                    amount = round(random.uniform(200, 1500), 2)
            elif scenario == "impossible_travel":
                event_type = "Login Attempt"
                meta["impossible_travel"] = True
                meta["location_change"] = True
                meta["unusual_location"] = True
                status = "success"
            elif scenario == "volume_spike":
                event_type = "Transaction"
                amount = round(random.uniform(400, 2200), 2)
                meta["event_velocity"] = random.randint(20, 55)
                meta["user_history_deviation"] = random.uniform(5, 11)
            elif scenario == "payment_fail_then_success":
                event_type = "Payment"
                status = "success"
                amount = round(random.uniform(300, 2600), 2)
                meta["payment_failures"] = random.randint(3, 7)
            else:  # account_after_risky
                event_type = "Account Update"
                meta["account_change_after_risky_login"] = True
                meta["new_device"] = True
                meta["unusual_location"] = True

            meta["user_history_deviation"] = meta.get("user_history_deviation") or random.uniform(3, 9)

        return {
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip,
            "location": location,
            "device": device,
            "amount": amount,
            "status": status,
            "timestamp": datetime.utcnow(),
            "metadata_json": meta,
            "_forced_anomaly": force_anomaly,
        }

    async def _produce_one(self) -> None:
        db = SessionLocal()
        try:
            settings = db.query(AppSettings).first()
            status = db.query(SimulationStatus).first()
            if not status:
                status = SimulationStatus()
                db.add(status)
                db.commit()
                db.refresh(status)

            anomaly_rate = (
                (settings.anomaly_injection_rate if settings else None)
                or status.anomaly_rate
                or 0.18
            )
            force_anomaly = random.random() < float(anomaly_rate)
            raw = self._build_raw_event(force_anomaly)
            event_row = self._analyze_and_persist(db, raw, status, settings)
            event_dict = self._event_to_dict(event_row)
            await manager.broadcast_event(event_dict)

            risk_result = {
                "risk_score": event_row.risk_score,
                "risk_level": event_row.risk_level,
                "risk_factors": event_row.risk_factors or [],
                "recommended_action": event_row.recommended_action,
            }
            alert = create_alert_from_event(db, event_row, risk_result)
            if alert and alert.status == "Open":
                await manager.broadcast_alert(alert_to_dict(alert))

            await manager.broadcast_stats_hint()
            await manager.broadcast_simulation_status(self._status_dict(status))
        finally:
            db.close()

    def _analyze_and_persist(
        self,
        db: Session,
        raw: dict[str, Any],
        status: SimulationStatus,
        settings: Optional[AppSettings],
    ) -> Event:
        prediction = predict_anomaly(raw)
        anomaly_score = prediction["anomaly_score"]
        if raw.get("_forced_anomaly") and anomaly_score < 0.55:
            anomaly_score = max(anomaly_score, rule_based_anomaly_fallback(raw, prediction["features"]))
            anomaly_score = max(anomaly_score, 0.62)

        risk = calculate_risk_score(raw, anomaly_score)
        explanation = generate_mock_explanation(raw, risk["risk_score"], risk["risk_factors"])
        is_anomaly = bool(
            prediction["is_anomaly"]
            or raw.get("_forced_anomaly")
            or risk["risk_level"] in {"High", "Critical"}
            or anomaly_score >= 0.55
        )

        event = Event(
            event_id=f"EVT-{uuid.uuid4().hex[:12].upper()}",
            event_type=raw["event_type"],
            user_id=raw["user_id"],
            ip_address=raw["ip_address"],
            location=raw["location"],
            device=raw["device"],
            amount=raw.get("amount"),
            status=raw["status"],
            timestamp=raw["timestamp"],
            risk_score=risk["risk_score"],
            risk_level=risk["risk_level"],
            is_anomaly=is_anomaly,
            anomaly_score=anomaly_score,
            explanation_summary=explanation["plain_english_summary"],
            risk_factors=risk["risk_factors"],
            rule_triggers=risk["rule_triggers"],
            recommended_action=risk["recommended_action"],
            metadata_json=raw.get("metadata_json") or {},
            created_at=datetime.utcnow(),
        )
        db.add(event)
        db.flush()

        pred = ModelPrediction(
            event_id=event.id,
            model_type=prediction.get("model_type", "IsolationForest"),
            anomaly_score=anomaly_score,
            risk_score=risk["risk_score"],
            is_anomaly=is_anomaly,
            features=prediction.get("features") or {},
            created_at=datetime.utcnow(),
        )
        db.add(pred)

        self._upsert_user_profile(db, event)

        status.events_generated = (status.events_generated or 0) + 1
        if is_anomaly:
            status.anomalies_injected = (status.anomalies_injected or 0) + 1
        status.last_event_at = datetime.utcnow()
        status.updated_at = datetime.utcnow()
        if settings:
            status.interval_ms = settings.event_simulation_speed
            status.anomaly_rate = settings.anomaly_injection_rate

        db.commit()
        db.refresh(event)
        return event

    def _upsert_user_profile(self, db: Session, event: Event) -> None:
        profile = (
            db.query(UserRiskProfile)
            .filter(UserRiskProfile.user_id == event.user_id)
            .first()
        )
        if not profile:
            profile = UserRiskProfile(user_id=event.user_id)
            db.add(profile)
            db.flush()

        profile.total_events = (profile.total_events or 0) + 1
        if event.event_type == "Login Attempt" and (event.status or "").lower() in {
            "failed",
            "failure",
            "denied",
        }:
            profile.failed_logins = (profile.failed_logins or 0) + 1
        if event.event_type in {"Transaction", "Payment"}:
            profile.transactions = (profile.transactions or 0) + 1

        # Recompute average lightly
        prev_avg = profile.average_risk_score or 0
        n = profile.total_events
        profile.average_risk_score = round(((prev_avg * (n - 1)) + event.risk_score) / n, 2)
        if event.risk_score >= (profile.highest_risk_score or 0):
            profile.highest_risk_score = event.risk_score
            profile.highest_risk_event_id = event.event_id
        profile.last_active = event.timestamp

        locations = list(profile.common_locations or [])
        if event.location and event.location not in locations:
            locations = ([event.location] + locations)[:5]
        profile.common_locations = locations

        devices = list(profile.common_devices or [])
        if event.device and event.device not in devices:
            devices = ([event.device] + devices)[:5]
        profile.common_devices = devices

        if event.is_anomaly:
            recent = list(profile.recent_anomalies or [])
            recent.insert(
                0,
                {
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "risk_score": event.risk_score,
                    "timestamp": event.timestamp.isoformat() if event.timestamp else None,
                },
            )
            profile.recent_anomalies = recent[:10]
        profile.updated_at = datetime.utcnow()

    def _event_to_dict(self, event: Event) -> dict[str, Any]:
        return {
            "id": event.id,
            "event_id": event.event_id,
            "event_type": event.event_type,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "location": event.location,
            "device": event.device,
            "amount": event.amount,
            "status": event.status,
            "timestamp": event.timestamp,
            "risk_score": event.risk_score,
            "risk_level": event.risk_level,
            "is_anomaly": event.is_anomaly,
            "anomaly_score": event.anomaly_score,
            "explanation_summary": event.explanation_summary,
            "risk_factors": event.risk_factors,
            "rule_triggers": event.rule_triggers,
            "recommended_action": event.recommended_action,
            "metadata_json": event.metadata_json,
        }

    async def analyze_external(self, db: Session, payload: dict[str, Any]) -> Event:
        """Analyze an externally posted event and persist it."""
        status = db.query(SimulationStatus).first()
        if not status:
            status = SimulationStatus()
            db.add(status)
            db.commit()
            db.refresh(status)
        settings = db.query(AppSettings).first()
        raw = {
            **payload,
            "timestamp": payload.get("timestamp") or datetime.utcnow(),
            "metadata_json": payload.get("metadata_json") or {},
            "_forced_anomaly": False,
        }
        event = self._analyze_and_persist(db, raw, status, settings)
        await manager.broadcast_event(self._event_to_dict(event))
        risk_result = {
            "risk_score": event.risk_score,
            "risk_level": event.risk_level,
            "risk_factors": event.risk_factors or [],
            "recommended_action": event.recommended_action,
        }
        alert = create_alert_from_event(db, event, risk_result)
        if alert:
            await manager.broadcast_alert(alert_to_dict(alert))
        await manager.broadcast_stats_hint()
        return event


simulator = EventSimulator()
