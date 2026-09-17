"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import SessionLocal, init_db
from models import SimulationStatus
from routes import (
    alerts,
    analytics,
    auth,
    dashboard,
    events,
    model_monitoring,
    reports,
    settings as settings_routes,
    simulator,
    users,
)
from services.anomaly_model import ensure_model
from services.websocket_manager import manager

app_settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    ensure_model()
    # Clear stale simulator running flag after process restart
    db = SessionLocal()
    try:
        status = db.query(SimulationStatus).first()
        if status and status.is_running:
            status.is_running = False
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title=app_settings.app_name,
    version=app_settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(events.router)
app.include_router(alerts.router)
app.include_router(simulator.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(model_monitoring.router)
app.include_router(settings_routes.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": app_settings.app_name,
        "version": app_settings.app_version,
    }


@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json(
            {"type": "connected", "data": {"message": "Risk Radar live feed connected"}}
        )
        while True:
            message = await websocket.receive_text()
            # Respond to client heartbeats
            if message.strip().lower() in {"ping", '{"type":"ping"}'}:
                await manager.send_ping(websocket)
            else:
                try:
                    payload = json.loads(message)
                    if payload.get("type") == "ping":
                        await manager.send_ping(websocket)
                except Exception:
                    await manager.send_ping(websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
