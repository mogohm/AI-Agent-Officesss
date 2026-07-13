"""VPS workspace orchestration (mock).

Bridges the API to the worker package. For MVP nothing touches a real shell —
the worker returns mock responses. When you wire up a real VPS, only the worker
implementations change; this service and its callers stay the same.
"""
from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, select

from api.models import Project, ProjectFile, VPSWorkspace
from api.services import activity_service
from worker.command_executor import CommandExecutor
from worker.workspace_manager import WorkspaceManager

_workspaces = WorkspaceManager()
_executor = CommandExecutor()


def _project(session: Session, project_id: int) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def create_workspace(session: Session, project_id: int) -> VPSWorkspace:
    project = _project(session, project_id)
    result = _workspaces.create_workspace(project.company_id, project.id, project.name)
    project.workspace_path = result["path"]
    project.vps_status = "running"
    session.add(project)

    workspace = session.exec(
        select(VPSWorkspace).where(VPSWorkspace.project_id == project_id)
    ).first()
    if not workspace:
        workspace = VPSWorkspace(project_id=project_id, path=result["path"])
    workspace.status = "running"
    workspace.path = result["path"]
    session.add(workspace)

    # Scaffold the standard workspace tree as ProjectFile rows (mock).
    existing = {f.path for f in session.exec(
        select(ProjectFile).where(ProjectFile.project_id == project_id)).all()}
    for entry in result["tree"]:
        if entry["path"] not in existing:
            session.add(ProjectFile(project_id=project_id, path=entry["path"],
                                    kind=entry["kind"], preview=entry.get("preview", "")))
    session.commit()
    session.refresh(workspace)

    await activity_service.record(
        session, message=f"VPS created workspace at {result['path']}",
        action="vps", status="success", company_id=project.company_id, project_id=project.id,
    )
    return workspace


def list_files(session: Session, project_id: int) -> list[ProjectFile]:
    _project(session, project_id)
    return session.exec(
        select(ProjectFile).where(ProjectFile.project_id == project_id).order_by(ProjectFile.path)
    ).all()


def read_logs(session: Session, project_id: int) -> list[dict]:
    project = _project(session, project_id)
    return _workspaces.read_logs(project.workspace_path or project.name)


async def run_command(session: Session, project_id: int, command: str) -> dict:
    project = _project(session, project_id)
    result = _executor.run(project.workspace_path or project.name, command)
    await activity_service.record(
        session,
        message=f"Ran command '{command}' → {result['status']}",
        action="command", status=result["status"],
        company_id=project.company_id, project_id=project.id,
    )
    return result


def status(session: Session, project_id: int) -> dict:
    project = _project(session, project_id)
    workspace = session.exec(
        select(VPSWorkspace).where(VPSWorkspace.project_id == project_id)
    ).first()
    return _workspaces.status(workspace)
