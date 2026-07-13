"""Metadata + server monitor endpoints (option lists, VPS status overview)."""
from __future__ import annotations

import random

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, select

from api.db.database import get_session
from api.models import Company, Project, VPSWorkspace
from api.utils.enums import (
    AGENT_ROLES, AGENT_STATUSES, DEPARTMENT_TYPES, IDLE_ACTIVITIES,
    MAX_DEPARTMENTS, PROJECT_STATUSES, PROJECT_TYPES,
)

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta/options")
def options():
    """All enum/option lists the frontend needs for dropdowns."""
    return {
        "max_departments": MAX_DEPARTMENTS,
        "department_types": DEPARTMENT_TYPES,
        "agent_roles": AGENT_ROLES,
        "agent_statuses": AGENT_STATUSES,
        "project_types": PROJECT_TYPES,
        "project_statuses": PROJECT_STATUSES,
        "idle_activities": IDLE_ACTIVITIES,
    }


@router.get("/server/status")
def server_status(session: Session = Depends(get_session)):
    """Mock VPS/server monitor summary for the Server Monitor page."""
    companies = session.exec(select(func.count()).select_from(Company)).one()
    projects = session.exec(select(func.count()).select_from(Project)).one()
    workspaces = session.exec(select(VPSWorkspace)).all()
    running = sum(1 for w in workspaces if w.status == "running")
    # FUTURE: replace mock metrics with real VPS telemetry (psutil / node_exporter).
    return {
        "online": True,
        "region": "sgp1 (mock)",
        "uptime_hours": 128,
        "cpu_percent": round(random.uniform(8, 42), 1),
        "memory_percent": round(random.uniform(30, 70), 1),
        "disk_percent": round(random.uniform(20, 55), 1),
        "companies": companies,
        "projects": projects,
        "workspaces_total": len(workspaces),
        "workspaces_running": running,
    }
