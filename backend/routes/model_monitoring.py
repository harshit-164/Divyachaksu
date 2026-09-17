"""Model monitoring endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, ModelPrediction
from schemas import ModelPredictionOut, ModelStatusOut, NamedCount
from services.anomaly_model import get_model_status, set_model_threshold, train_isolation_forest

router = APIRouter(prefix="/api/model", tags=["model"])


class ThresholdUpdate(BaseModel):
    threshold: float = Field(..., ge=0.3, le=0.9)


@router.get("/status", response_model=ModelStatusOut)
def model_status(db: Session = Depends(get_db)):
    status = get_model_status()
    avg = db.query(func.avg(ModelPrediction.anomaly_score)).scalar() or 0
    anomaly_preds = (
        db.query(func.count(ModelPrediction.id))
        .filter(ModelPrediction.is_anomaly.is_(True))
        .scalar()
        or 0
    )
    # Real FP counter from analyst outcomes
    false_positive_count = (
        db.query(func.count(Alert.id)).filter(Alert.status == "False Positive").scalar() or 0
    )
    resolved = (
        db.query(func.count(Alert.id)).filter(Alert.status == "Resolved").scalar() or 0
    )
    return ModelStatusOut(
        model_type=status.get("model_type", "IsolationForest"),
        training_data_size=status.get("training_data_size", 0),
        last_trained=status.get("last_trained"),
        average_anomaly_score=round(float(avg), 4),
        false_positive_count=int(false_positive_count),
        true_positive_placeholder=int(resolved),
        model_threshold=float(status.get("model_threshold", 0.55)),
        feature_importance=[NamedCount(**x) for x in status.get("feature_importance", [])],
        is_trained=bool(status.get("is_trained")),
    )


@router.post("/train", response_model=ModelStatusOut)
def train_model(db: Session = Depends(get_db)):
    train_isolation_forest()
    return model_status(db)


@router.put("/threshold", response_model=ModelStatusOut)
def update_threshold(payload: ThresholdUpdate, db: Session = Depends(get_db)):
    try:
        set_model_threshold(payload.threshold)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return model_status(db)


@router.get("/predictions", response_model=list[ModelPredictionOut])
def recent_predictions(limit: int = 40, db: Session = Depends(get_db)):
    return (
        db.query(ModelPrediction)
        .order_by(ModelPrediction.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
