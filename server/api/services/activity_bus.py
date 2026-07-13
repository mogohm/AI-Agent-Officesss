"""In-process pub/sub for realtime activity over WebSockets.

For MVP this is a simple connection registry with topic fan-out. Swap the
internals for Redis pub/sub later (see settings.redis_url) to scale across
multiple worker processes without changing callers.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ActivityBus:
    def __init__(self) -> None:
        # topic -> set of connected sockets. Topic "activities" is the global
        # feed; "project:{id}" scopes to one project.
        self._topics: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, topic: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._topics[topic].add(websocket)

    async def disconnect(self, websocket: WebSocket, topic: str) -> None:
        async with self._lock:
            self._topics[topic].discard(websocket)

    async def publish(self, topic: str, payload: dict[str, Any]) -> None:
        """Send a JSON payload to all sockets subscribed to a topic."""
        dead: list[WebSocket] = []
        for ws in list(self._topics.get(topic, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._topics[topic].discard(ws)

    async def broadcast_activity(self, payload: dict[str, Any]) -> None:
        """Publish to the global feed and the project-scoped topic (if any)."""
        await self.publish("activities", payload)
        project_id = payload.get("project_id")
        if project_id is not None:
            await self.publish(f"project:{project_id}", payload)


# Singleton used across routers/services.
activity_bus = ActivityBus()
