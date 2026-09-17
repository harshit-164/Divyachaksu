"""Simulator control endpoints."""

from fastapi import APIRouter

from schemas import SimulationStatusOut
from services.event_simulator import simulator

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


@router.post("/start", response_model=SimulationStatusOut)
async def start_simulator():
    return await simulator.start()


@router.post("/stop", response_model=SimulationStatusOut)
async def stop_simulator():
    return await simulator.stop()


@router.get("/status", response_model=SimulationStatusOut)
def simulator_status():
    return simulator.get_status()
