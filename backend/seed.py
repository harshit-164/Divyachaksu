"""Seed database with realistic demo data."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models import (
    Alert,
    AnalystNote,
    AnomalyReport,
    Event,
    ModelPrediction,
    RiskFactor,
    Settings as AppSettings,
    SimulationStatus,
    User,
    UserRiskProfile,
)
from services.ai_explanation_service import generate_mock_explanation, generate_mock_report_summary
from services.anomaly_model import ensure_model, predict_anomaly
from services.risk_scoring_service import calculate_risk_score
from services.report_service import collect_report_data
from utils.risk_utils import EVENT_TYPES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
rng = random.Random(42)

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
]
DEVICES = ["Chrome/Windows", "Safari/iOS", "Firefox/Linux", "Edge/Windows", "Mobile Android", "API Client"]
USER_IDS = [f"USR-{i:04d}" for i in range(1, 31)]


def _eid() -> str:
    return f"EVT-{uuid.uuid4().hex[:12].upper()}"


def _aid() -> str:
    return f"ALT-{uuid.uuid4().hex[:10].upper()}"


def _rid() -> str:
    return f"RPT-{uuid.uuid4().hex[:10].upper()}"


def build_event_payload(force_anomaly: bool = False) -> dict:
    event_type = rng.choice(EVENT_TYPES)
    user_id = rng.choice(USER_IDS)
    meta = {
        "user_avg_amount": rng.uniform(40, 160),
        "failed_login_count": 0,
        "api_request_volume": rng.randint(1, 35),
        "event_velocity": rng.randint(1, 7),
        "ip_repetition": rng.randint(1, 4),
        "users_from_ip": 1,
        "payment_failures": 0,
        "password_reset_count": 0,
    }
    amount = None
    status = "success"
    location = rng.choice(LOCATIONS)
    device = rng.choice(DEVICES)
    ip = f"198.51.{rng.randint(0, 200)}.{rng.randint(1, 254)}"

    if event_type in {"Transaction", "Payment"}:
        amount = round(rng.uniform(10, 280), 2)
    if event_type == "Login Attempt":
        status = rng.choices(["success", "failed"], weights=[0.88, 0.12])[0]

    if force_anomaly:
        pick = rng.randint(0, 9)
        if pick == 0:
            event_type, amount = "Payment", round(rng.uniform(3200, 9000), 2)
            meta.update({"unusual_location": True, "new_device": True, "user_avg_amount": 55})
            location, device = "Unknown Region", "Unknown Device"
        elif pick == 1:
            event_type, status = "Login Attempt", "failed"
            meta.update({"failed_login_count": 12, "ip_repetition": 18, "event_velocity": 22})
        elif pick == 2:
            event_type = "API Request"
            meta.update({"api_request_volume": 260, "burst_score": 8, "event_velocity": 40})
        elif pick == 3:
            event_type = "Password Reset"
            meta.update({"password_reset_count": 5, "event_velocity": 12})
            amount = None
        elif pick == 4:
            event_type = "Login Attempt"
            meta.update({"users_from_ip": 9, "ip_repetition": 28})
        elif pick == 5:
            event_type, amount = "Transaction", round(rng.uniform(1500, 5000), 2)
            meta.update({"user_avg_amount": 40, "user_history_deviation": 8})
        elif pick == 6:
            event_type = "Login Attempt"
            meta.update({"impossible_travel": True, "location_change": True, "unusual_location": True})
        elif pick == 7:
            event_type, status, amount = "Payment", "success", round(rng.uniform(500, 3000), 2)
            meta["payment_failures"] = 4
        elif pick == 8:
            event_type = "Account Update"
            meta.update({"account_change_after_risky_login": True, "new_device": True})
        else:
            event_type = "API Request"
            meta.update({"api_request_volume": 180, "unusual_location": True, "burst_score": 7})
            location = "Unknown Region"

    return {
        "event_type": event_type,
        "user_id": user_id,
        "ip_address": ip,
        "location": location,
        "device": device,
        "amount": amount,
        "status": status,
        "timestamp": datetime.utcnow() - timedelta(minutes=rng.randint(1, 60 * 24 * 10)),
        "metadata_json": meta,
        "_forced_anomaly": force_anomaly,
    }


def persist_event(db: Session, raw: dict, store_prediction: bool = True) -> Event:
    prediction = predict_anomaly(raw)
    anomaly_score = prediction["anomaly_score"]
    if raw.get("_forced_anomaly"):
        anomaly_score = max(anomaly_score, 0.65)
    risk = calculate_risk_score(raw, anomaly_score)
    explanation = generate_mock_explanation(raw, risk["risk_score"], risk["risk_factors"])
    is_anomaly = bool(
        raw.get("_forced_anomaly")
        or prediction["is_anomaly"]
        or risk["risk_level"] in {"High", "Critical"}
    )
    event = Event(
        event_id=_eid(),
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
    if store_prediction:
        db.add(
            ModelPrediction(
                event_id=event.id,
                model_type="IsolationForest",
                anomaly_score=anomaly_score,
                risk_score=risk["risk_score"],
                is_anomaly=is_anomaly,
                features=prediction.get("features") or {},
                created_at=event.timestamp,
            )
        )
    return event


def rebuild_profiles(db: Session) -> None:
    db.query(UserRiskProfile).delete()
    db.commit()
    events = db.query(Event).order_by(Event.timestamp.asc()).all()
    profiles: dict[str, UserRiskProfile] = {}
    for e in events:
        p = profiles.get(e.user_id)
        if not p:
            p = UserRiskProfile(user_id=e.user_id, common_locations=[], common_devices=[], recent_anomalies=[])
            profiles[e.user_id] = p
            db.add(p)
        p.total_events = (p.total_events or 0) + 1
        if e.event_type == "Login Attempt" and (e.status or "").lower() in {"failed", "failure", "denied"}:
            p.failed_logins = (p.failed_logins or 0) + 1
        if e.event_type in {"Transaction", "Payment"}:
            p.transactions = (p.transactions or 0) + 1
        prev = p.average_risk_score or 0
        n = p.total_events
        p.average_risk_score = round(((prev * (n - 1)) + e.risk_score) / n, 2)
        if e.risk_score >= (p.highest_risk_score or 0):
            p.highest_risk_score = e.risk_score
            p.highest_risk_event_id = e.event_id
        p.last_active = e.timestamp
        locs = list(p.common_locations or [])
        if e.location and e.location not in locs:
            locs = ([e.location] + locs)[:5]
        p.common_locations = locs
        devices = list(p.common_devices or [])
        if e.device and e.device not in devices:
            devices = ([e.device] + devices)[:5]
        p.common_devices = devices
        if e.is_anomaly:
            recent = list(p.recent_anomalies or [])
            recent.insert(
                0,
                {
                    "event_id": e.event_id,
                    "event_type": e.event_type,
                    "risk_score": e.risk_score,
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                },
            )
            p.recent_anomalies = recent[:8]
        p.updated_at = datetime.utcnow()
    db.commit()


def seed(force: bool = False) -> None:
    init_db()
    ensure_model()
    db: Session = SessionLocal()
    try:
        existing = db.query(Event).count()
        if existing > 0 and not force:
            print(f"Database already seeded ({existing} events). Use --force to reseed.")
            return

        # Clear
        for table in [
            AnalystNote,
            Alert,
            ModelPrediction,
            Event,
            UserRiskProfile,
            AnomalyReport,
            RiskFactor,
            SimulationStatus,
            AppSettings,
            User,
        ]:
            db.query(table).delete()
        db.commit()

        admin = User(
            email="admin@riskradar.demo",
            username="admin",
            full_name="Divyachaksu Admin",
            hashed_password=pwd_context.hash("admin123"),
            role="admin",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(admin)
        db.commit()

        # Risk factors catalog (20)
        factor_defs = [
            ("HIGH_AMOUNT", "High transaction amount", "Amount far above user baseline", 1.2, "payment"),
            ("FAILED_LOGINS", "Repeated failed logins", "Burst of authentication failures", 1.4, "auth"),
            ("UNUSUAL_LOCATION", "Unusual location", "Location outside common geography", 1.1, "geo"),
            ("NEW_DEVICE", "New device", "Unrecognized device fingerprint", 0.9, "device"),
            ("IP_PATTERN", "Suspicious IP pattern", "High repetition from one IP", 1.3, "network"),
            ("HIGH_VELOCITY", "High event velocity", "Rapid successive actions", 1.2, "behavior"),
            ("SHARED_IP", "Multiple users from same IP", "Shared IP across accounts", 1.4, "network"),
            ("PAYMENT_FAILS", "Payment failure repetition", "Failures preceding success", 1.0, "payment"),
            ("ACCOUNT_CHANGE", "Account change after risky login", "Sensitive update after risk", 1.3, "account"),
            ("API_SPIKE", "API request spike", "Burst API traffic", 1.2, "api"),
            ("IMPOSSIBLE_TRAVEL", "Impossible travel", "Geo hops faster than travel", 1.5, "geo"),
            ("RESET_BURST", "Password reset burst", "Excessive reset attempts", 1.1, "auth"),
            ("ML_ANOMALY", "ML anomaly signal", "Isolation Forest elevation", 1.0, "ml"),
            ("NIGHT_ACTIVITY", "Off-hours activity", "Activity outside normal hours", 0.7, "behavior"),
            ("CARD_SHARING", "Instrument shared across users", "Same instrument linked widely", 1.4, "payment"),
            ("GEO_DEVIATION", "Location deviation", "Sudden location shift", 1.0, "geo"),
            ("DEVICE_FLIP", "Device flip", "Rapid device switching", 0.8, "device"),
            ("ERROR_BURST", "Error burst", "Elevated API/payment errors", 0.9, "api"),
            ("BASELINE_DRIFT", "Baseline drift", "User history deviation", 1.0, "behavior"),
            ("SESSION_RISK", "Session risk composite", "Composite session risk factors", 1.1, "session"),
        ]
        for code, name, desc, weight, category in factor_defs:
            db.add(
                RiskFactor(
                    code=code,
                    name=name,
                    description=desc,
                    weight=weight,
                    category=category,
                    is_active=True,
                )
            )
        db.commit()

        events: list[Event] = []
        # 500 historical + ensure ~60 anomalies (force 60)
        for i in range(500):
            force_a = i < 60
            raw = build_event_payload(force_anomaly=force_a)
            events.append(persist_event(db, raw, store_prediction=False))
            if (i + 1) % 100 == 0:
                db.commit()
                print(f"  seeded {i + 1} events...")
        db.commit()

        # 100 model predictions from recent events
        for e in events[-100:]:
            db.add(
                ModelPrediction(
                    event_id=e.id,
                    model_type="IsolationForest",
                    anomaly_score=e.anomaly_score,
                    risk_score=e.risk_score,
                    is_anomaly=e.is_anomaly,
                    features={"seeded": True},
                    created_at=e.timestamp,
                )
            )
        db.commit()

        rebuild_profiles(db)
        # Keep top 15 profiles if more exist — already ~30, trim by deleting extras? Spec says 15 profiles.
        profiles = (
            db.query(UserRiskProfile)
            .order_by(UserRiskProfile.average_risk_score.desc())
            .all()
        )
        for extra in profiles[15:]:
            db.delete(extra)
        db.commit()

        # 25 alerts from anomalous/high-risk events
        candidates = (
            db.query(Event)
            .filter(Event.is_anomaly.is_(True))
            .order_by(Event.risk_score.desc())
            .limit(25)
            .all()
        )
        alerts: list[Alert] = []
        statuses = ["Open"] * 12 + ["Investigating"] * 5 + ["Resolved"] * 5 + ["False Positive"] * 3
        for i, e in enumerate(candidates):
            alert = Alert(
                alert_id=_aid(),
                event_id=e.id,
                alert_type=e.event_type,
                severity=e.risk_level if e.risk_level in {"Low", "Medium", "High", "Critical"} else "High",
                title=f"{e.risk_level}: {e.event_type} anomaly for {e.user_id}",
                description=e.explanation_summary,
                risk_score=e.risk_score,
                status=statuses[i % len(statuses)],
                assigned_to="Analyst Desk" if i % 2 == 0 else None,
                recommended_action=e.recommended_action,
                created_at=e.timestamp,
                resolved_at=e.timestamp + timedelta(hours=2) if statuses[i % len(statuses)] in {"Resolved", "False Positive"} else None,
            )
            db.add(alert)
            alerts.append(alert)
        db.commit()

        # 10 analyst notes
        for i in range(10):
            alert = alerts[i % len(alerts)]
            db.add(
                AnalystNote(
                    alert_id=alert.id,
                    author_id=admin.id,
                    author_name="Divyachaksu Admin",
                    note=f"Investigating pattern for {alert.alert_type}. Initial review note #{i + 1}.",
                    created_at=datetime.utcnow() - timedelta(hours=i),
                )
            )
        db.commit()

        # 5 reports
        for i in range(5):
            data = collect_report_data(db, hours=24 + i * 12)
            db.add(
                AnomalyReport(
                    report_id=_rid(),
                    title=f"Daily Anomaly Summary #{i + 1}",
                    report_type="daily_summary",
                    period_start=datetime.utcnow() - timedelta(days=i + 1),
                    period_end=datetime.utcnow() - timedelta(days=i),
                    summary=f"Seeded report {i + 1}: {data['totals']['anomalies']} anomalies observed.",
                    executive_summary=generate_mock_report_summary(data),
                    data=data,
                    created_at=datetime.utcnow() - timedelta(days=i),
                )
            )
        db.commit()

        db.add(
            SimulationStatus(
                is_running=False,
                events_generated=0,
                anomalies_injected=0,
                interval_ms=1500,
                anomaly_rate=0.18,
                updated_at=datetime.utcnow(),
            )
        )
        db.add(
            AppSettings(
                business_name="Divyachaksu Demo",
                risk_threshold=40,
                critical_alert_threshold=90,
                event_simulation_speed=1500,
                anomaly_injection_rate=0.18,
                ai_provider="gemini",
                api_key_placeholder="",
                chat_model="gemini-2.5-flash",
                alert_notifications_enabled=True,
            )
        )
        db.commit()

        print("Seed complete:")
        print(f"  users={db.query(User).count()}")
        print(f"  events={db.query(Event).count()}")
        print(f"  anomalies={db.query(Event).filter(Event.is_anomaly.is_(True)).count()}")
        print(f"  alerts={db.query(Alert).count()}")
        print(f"  risk_factors={db.query(RiskFactor).count()}")
        print(f"  profiles={db.query(UserRiskProfile).count()}")
        print(f"  notes={db.query(AnalystNote).count()}")
        print(f"  reports={db.query(AnomalyReport).count()}")
        print(f"  predictions={db.query(ModelPrediction).count()}")
        print("  Demo login: admin / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    import sys

    seed(force="--force" in sys.argv)
