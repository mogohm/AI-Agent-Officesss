"""Business logic for projects, incl. mock lifecycle (start/pause/resume)."""
from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, select

from api.models import Agent, Project, ProjectFile, Task
from api.schemas import ProjectCreate, ProjectUpdate
from api.services import activity_service


def list_projects(session: Session, company_id: int) -> list[Project]:
    return session.exec(
        select(Project).where(Project.company_id == company_id).order_by(Project.id)
    ).all()


def get_project(session: Session, project_id: int) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def create_project(session: Session, company_id: int, data: ProjectCreate) -> Project:
    project = Project(company_id=company_id, **data.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def update_project(session: Session, project_id: int, data: ProjectUpdate) -> Project:
    project = get_project(session, project_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def delete_project(session: Session, project_id: int) -> None:
    project = get_project(session, project_id)
    for model in (Task, ProjectFile):
        for row in session.exec(select(model).where(model.project_id == project_id)).all():
            session.delete(row)
    session.delete(project)
    session.commit()


def _set_assigned_agents_status(session: Session, project: Project, status: str) -> None:
    if not project.assigned_agent_ids:
        return
    agents = session.exec(select(Agent).where(Agent.id.in_(project.assigned_agent_ids))).all()
    for agent in agents:
        agent.status = status
        agent.animation_state = status
        session.add(agent)
    session.commit()


async def start_project(session: Session, project_id: int) -> Project:
    project = get_project(session, project_id)
    project.status = "in_progress"
    project.vps_status = "running"
    session.add(project)
    session.commit()
    session.refresh(project)
    _set_assigned_agents_status(session, project, "planning")
    await activity_service.record(
        session, message=f"Project '{project.name}' started. Agents are getting to work.",
        action="start", status="success", company_id=project.company_id, project_id=project.id,
    )
    return project


async def pause_project(session: Session, project_id: int) -> Project:
    project = get_project(session, project_id)
    project.status = "paused"
    session.add(project)
    session.commit()
    session.refresh(project)
    _set_assigned_agents_status(session, project, "waiting")
    await activity_service.record(
        session, message=f"Project '{project.name}' paused.", action="pause",
        status="warning", company_id=project.company_id, project_id=project.id,
    )
    return project


async def resume_project(session: Session, project_id: int) -> Project:
    project = get_project(session, project_id)
    project.status = "in_progress"
    session.add(project)
    session.commit()
    session.refresh(project)
    _set_assigned_agents_status(session, project, "coding")
    await activity_service.record(
        session, message=f"Project '{project.name}' resumed.", action="resume",
        status="info", company_id=project.company_id, project_id=project.id,
    )
    return project
