"""Application configuration."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    app_name: str = "Divyachaksu — Real-Time Fraud & Anomaly Detection"
    app_version: str = "1.0.0"
    debug: bool = True

    # Default to SQLite for easy local demo; override with PostgreSQL in production
    database_url: str = "sqlite:///./fraud_detection.db"

    # CORS
    cors_origins: str = (
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,"
        "http://127.0.0.1:5181,http://localhost:5181,http://127.0.0.1:5177,http://localhost:5177"
    )

    # JWT (structure ready; demo uses soft auth)
    jwt_secret: str = "change-me-risk-radar-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    # Gemini AI explanations
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Simulator defaults
    simulator_interval_ms: int = 1500
    anomaly_injection_rate: float = 0.18

    # Risk thresholds
    risk_threshold: int = 40
    critical_alert_threshold: int = 90

    # ML model path
    model_path: str = "models_store/isolation_forest.joblib"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
