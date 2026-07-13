from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.db.database import get_session
from api.models import ProjectFile, VPSWorkspace
from api.schemas import RunCommandRequest
from api.services import vps_service

router = APIRouter(tags=["vps"])


@router.post("/api/projects/{project_id}/workspace/create", response_model=VPSWorkspace)
async def create_workspace(project_id: int, session: Session = Depends(get_session)):
    return await vps_service.create_workspace(session, project_id)


@router.get("/api/projects/{project_id}/workspace/files", response_model=list[ProjectFile])
def workspace_files(project_id: int, session: Session = Depends(get_session)):
    return vps_service.list_files(session, project_id)


@router.get("/api/projects/{project_id}/workspace/logs")
def workspace_logs(project_id: int, session: Session = Depends(get_session)):
    return vps_service.read_logs(session, project_id)


@router.get("/api/projects/{project_id}/workspace/status")
def workspace_status(project_id: int, session: Session = Depends(get_session)):
    return vps_service.status(session, project_id)


@router.post("/api/projects/{project_id}/workspace/run-command")
async def run_command(project_id: int, body: RunCommandRequest, session: Session = Depends(get_session)):
    return await vps_service.run_command(session, project_id, body.command)
