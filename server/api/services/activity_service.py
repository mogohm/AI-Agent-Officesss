"""Create activity rows and fan them out to WebSocket subscribers."""
from __future__ import annotations

from typing import Optional

from sqlmodel import Session

from api.models import Activity
from api.services.activity_bus import activity_bus


def _serialize(activity: Activity) -> dict:
    return {
        "id": activity.id,
        "company_id": activity.company_id,
        "project_id": activity.project_id,
        "department_id": activity.department_id,
        "agent_id": activity.agent_id,
        "action": activity.action,
        "status": activity.status,
        "message": activity.message,
        "related_file": activity.related_file,
        "created_at": activity.created_at.isoformat(),
    }


async def record(
    session: Session,
    *,
    message: str,
    action: str = "system",
    status: str = "info",
    company_id: Optional[int] = None,
    project_id: Optional[int] = None,
    department_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    related_file: str = "",
) -> Activity:
    """Persist an activity and broadcast it in realtime."""
    activity = Activity(
        message=message, action=action, status=status, company_id=company_id,
        project_id=project_id, department_id=department_id, agent_id=agent_id,
        related_file=related_file,
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    await activity_bus.broadcast_activity(_serialize(activity))
    return activity
