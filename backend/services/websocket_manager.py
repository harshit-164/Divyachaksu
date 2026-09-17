"""WebSocket connection manager for live events and alerts."""

from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, client: WebSocket) -> None:
        await client.accept()
        self.active_connections.append(client)

    def disconnect(self, client: WebSocket) -> None:
        if client in self.active_connections:
            self.active_connections.remove(client)

    async def _broadcast(self, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self.disconnect(connection)

    async def broadcast_event(self, event: dict[str, Any]) -> None:
        await self._broadcast({"type": "event", "data": event})

    async def broadcast_alert(self, alert: dict[str, Any]) -> None:
        await self._broadcast({"type": "alert", "data": alert})

    async def broadcast_simulation_status(self, status: dict[str, Any]) -> None:
        await self._broadcast({"type": "simulation_status", "data": status})

    async def broadcast_stats_hint(self) -> None:
        await self._broadcast({"type": "stats_refresh", "data": {}})

    async def send_ping(self, client: WebSocket) -> None:
        try:
            await client.send_json({"type": "pong", "data": {}})
        except Exception:
            self.disconnect(client)


manager = ConnectionManager()
