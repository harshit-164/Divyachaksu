"""SQLAlchemy database models."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="admin")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    notes = relationship("AnalystNote", back_populates="author")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    event_type = Column(String(50), index=True, nullable=False)
    user_id = Column(String(64), index=True, nullable=False)
    ip_address = Column(String(64), index=True)
    location = Column(String(120))
    device = Column(String(120))
    amount = Column(Float, nullable=True)
    status = Column(String(50), default="success")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    risk_score = Column(Integer, default=0, index=True)
    risk_level = Column(String(20), default="Low", index=True)
    is_anomaly = Column(Boolean, default=False, index=True)
    anomaly_score = Column(Float, default=0.0)
    explanation_summary = Column(Text, nullable=True)
    risk_factors = Column(JSON, default=list)
    rule_triggers = Column(JSON, default=list)
    recommended_action = Column(String(255), nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    alerts = relationship("Alert", back_populates="event")
    predictions = relationship("ModelPrediction", back_populates="event")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(64), unique=True, index=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    alert_type = Column(String(80), index=True)
    severity = Column(String(20), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    risk_score = Column(Integer, default=0)
    status = Column(String(40), default="Open", index=True)
    assigned_to = Column(String(100), nullable=True)
    recommended_action = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    event = relationship("Event", back_populates="alerts")
    notes = relationship("AnalystNote", back_populates="alert", cascade="all, delete-orphan")


class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), unique=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    weight = Column(Float, default=1.0)
    category = Column(String(60))
    is_active = Column(Boolean, default=True)


class UserRiskProfile(Base):
    __tablename__ = "user_risk_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), unique=True, index=True, nullable=False)
    total_events = Column(Integer, default=0)
    failed_logins = Column(Integer, default=0)
    transactions = Column(Integer, default=0)
    average_risk_score = Column(Float, default=0.0)
    highest_risk_event_id = Column(String(64), nullable=True)
    highest_risk_score = Column(Integer, default=0)
    last_active = Column(DateTime, nullable=True)
    common_locations = Column(JSON, default=list)
    common_devices = Column(JSON, default=list)
    recent_anomalies = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    model_type = Column(String(80), default="IsolationForest")
    anomaly_score = Column(Float)
    risk_score = Column(Integer)
    is_anomaly = Column(Boolean, default=False)
    features = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="predictions")


class AnomalyReport(Base):
    __tablename__ = "anomaly_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    report_type = Column(String(80), default="daily_summary")
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    summary = Column(Text)
    executive_summary = Column(Text)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalystNote(Base):
    __tablename__ = "analyst_notes"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), default="Analyst")
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("Alert", back_populates="notes")
    author = relationship("User", back_populates="notes")


class SimulationStatus(Base):
    __tablename__ = "simulation_status"

    id = Column(Integer, primary_key=True, index=True)
    is_running = Column(Boolean, default=False)
    events_generated = Column(Integer, default=0)
    anomalies_injected = Column(Integer, default=0)
    interval_ms = Column(Integer, default=1500)
    anomaly_rate = Column(Float, default=0.18)
    last_event_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String(200), default="Risk Radar Demo")
    risk_threshold = Column(Integer, default=40)
    critical_alert_threshold = Column(Integer, default=90)
    event_simulation_speed = Column(Integer, default=1500)
    anomaly_injection_rate = Column(Float, default=0.18)
    ai_provider = Column(String(80), default="gemini")
    api_key_placeholder = Column(String(255), default="")
    chat_model = Column(String(120), default="gemini-2.5-flash")
    alert_notifications_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
