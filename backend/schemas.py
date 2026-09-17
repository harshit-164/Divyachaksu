"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Auth ----------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool


# ---------- Events ----------
class EventBase(BaseModel):
    event_type: str
    user_id: str
    ip_address: Optional[str] = None
    location: Optional[str] = None
    device: Optional[str] = None
    amount: Optional[float] = None
    status: str = "success"
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class EventCreate(EventBase):
    pass


class EventAnalyzeRequest(BaseModel):
    event_type: str
    user_id: str
    timestamp: Optional[datetime] = None
    ip_address: Optional[str] = "0.0.0.0"
    location: Optional[str] = "Unknown"
    device: Optional[str] = "Unknown"
    amount: Optional[float] = None
    status: str = "success"
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    event_type: str
    user_id: str
    ip_address: Optional[str] = None
    location: Optional[str] = None
    device: Optional[str] = None
    amount: Optional[float] = None
    status: str
    timestamp: datetime
    risk_score: int
    risk_level: str
    is_anomaly: bool
    anomaly_score: float
    explanation_summary: Optional[str] = None
    risk_factors: Optional[list[Any]] = None
    rule_triggers: Optional[list[Any]] = None
    recommended_action: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None


class EventListResponse(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    page_size: int


# ---------- Alerts ----------
class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    recommended_action: Optional[str] = None


class AnalystNoteCreate(BaseModel):
    note: str
    author_name: str = "Analyst"


class AnalystNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: int
    author_name: str
    note: str
    created_at: datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: str
    event_id: Optional[int] = None
    alert_type: Optional[str] = None
    severity: str
    title: str
    description: Optional[str] = None
    risk_score: int
    status: str
    assigned_to: Optional[str] = None
    recommended_action: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    notes: list[AnalystNoteOut] = Field(default_factory=list)


class AlertListResponse(BaseModel):
    items: list[AlertOut]
    total: int
    page: int
    page_size: int


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    total_events: int
    anomalies_detected: int
    critical_alerts: int
    average_risk_score: float
    failed_login_spikes: int
    suspicious_transactions: int
    api_traffic_anomalies: int
    open_alerts: int
    high_risk_events: int
    simulator_running: bool


# ---------- Simulator ----------
class SimulationStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_running: bool
    events_generated: int
    anomalies_injected: int
    interval_ms: int
    anomaly_rate: float
    last_event_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None


# ---------- Analytics ----------
class TimeSeriesPoint(BaseModel):
    label: str
    value: float


class NamedCount(BaseModel):
    name: str
    value: float


# ---------- Reports ----------
class ReportGenerateRequest(BaseModel):
    report_type: str = "daily_summary"
    title: Optional[str] = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: str
    title: str
    report_type: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    summary: Optional[str] = None
    executive_summary: Optional[str] = None
    data: Optional[dict[str, Any]] = None
    created_at: datetime


# ---------- User Risk ----------
class UserRiskProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    total_events: int
    failed_logins: int
    transactions: int
    average_risk_score: float
    highest_risk_event_id: Optional[str] = None
    highest_risk_score: int
    last_active: Optional[datetime] = None
    common_locations: Optional[list[Any]] = None
    common_devices: Optional[list[Any]] = None
    recent_anomalies: Optional[list[Any]] = None


# ---------- Model ----------
class ModelStatusOut(BaseModel):
    model_type: str
    training_data_size: int
    last_trained: Optional[datetime] = None
    average_anomaly_score: float
    false_positive_count: int
    true_positive_placeholder: int
    model_threshold: float
    feature_importance: list[NamedCount]
    is_trained: bool


class ModelPredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: Optional[int] = None
    model_type: str
    anomaly_score: float
    risk_score: int
    is_anomaly: bool
    features: Optional[dict[str, Any]] = None
    created_at: datetime


# ---------- Settings ----------
class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_name: str
    risk_threshold: int
    critical_alert_threshold: int
    event_simulation_speed: int
    anomaly_injection_rate: float
    ai_provider: str
    api_key_placeholder: str
    chat_model: str
    alert_notifications_enabled: bool


class SettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    risk_threshold: Optional[int] = None
    critical_alert_threshold: Optional[int] = None
    event_simulation_speed: Optional[int] = None
    anomaly_injection_rate: Optional[float] = None
    ai_provider: Optional[str] = None
    api_key_placeholder: Optional[str] = None
    chat_model: Optional[str] = None
    alert_notifications_enabled: Optional[bool] = None


# ---------- AI Explanation ----------
class ExplanationOut(BaseModel):
    what_happened: str
    why_suspicious: str
    risk_factors: list[str]
    business_impact: str
    investigation_steps: list[str]
    suggested_response: str
    plain_english_summary: str
    source: str = "mock"
