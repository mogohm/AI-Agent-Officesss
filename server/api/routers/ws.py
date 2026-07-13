from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.services.activity_bus import activity_bus

router = APIRouter()


@router.websocket("/ws/activities")
async def ws_activities(websocket: WebSocket):
    """Global realtime activity feed."""
    await activity_bus.connect(websocket, "activities")
    try:
        while True:
            # We don't expect inbound messages; keep the socket alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await activity_bus.disconnect(websocket, "activities")


@router.websocket("/ws/projects/{project_id}")
async def ws_project(websocket: WebSocket, project_id: int):
    """Realtime feed scoped to a single project."""
    topic = f"project:{project_id}"
    await activity_bus.connect(websocket, topic)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await activity_bus.disconnect(websocket, topic)
