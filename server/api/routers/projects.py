from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.db.database import get_session
from api.models import Project
from api.schemas import ProjectCreate, ProjectUpdate
from api.services import project_service

router = APIRouter(tags=["projects"])


@router.get("/api/companies/{company_id}/projects", response_model=list[Project])
def list_projects(company_id: int, session: Session = Depends(get_session)):
    return project_service.list_projects(session, company_id)


@router.post("/api/companies/{company_id}/projects", response_model=Project, status_code=201)
def create_project(company_id: int, data: ProjectCreate, session: Session = Depends(get_session)):
    return project_service.create_project(session, company_id, data)


@router.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: int, session: Session = Depends(get_session)):
    return project_service.get_project(session, project_id)


@router.put("/api/projects/{project_id}", response_model=Project)
def update_project(project_id: int, data: ProjectUpdate, session: Session = Depends(get_session)):
    return project_service.update_project(session, project_id, data)


@router.delete("/api/projects/{project_id}", status_code=204)
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project_service.delete_project(session, project_id)


@router.post("/api/projects/{project_id}/start", response_model=Project)
async def start_project(project_id: int, session: Session = Depends(get_session)):
    return await project_service.start_project(session, project_id)


@router.post("/api/projects/{project_id}/pause", response_model=Project)
async def pause_project(project_id: int, session: Session = Depends(get_session)):
    return await project_service.pause_project(session, project_id)


@router.post("/api/projects/{project_id}/resume", response_model=Project)
async def resume_project(project_id: int, session: Session = Depends(get_session)):
    return await project_service.resume_project(session, project_id)
