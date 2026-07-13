from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from api.db.database import get_session
from api.models import Activity

router = APIRouter(tags=["activities"])


@router.get("/api/activities", response_model=list[Activity])
def list_activities(limit: int = Query(50, le=200), session: Session = Depends(get_session)):
    return session.exec(select(Activity).order_by(Activity.id.desc()).limit(limit)).all()


@router.get("/api/projects/{project_id}/activities", response_model=list[Activity])
def project_activities(project_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Activity).where(Activity.project_id == project_id).order_by(Activity.id.desc())
    ).all()


@router.get("/api/companies/{company_id}/activities", response_model=list[Activity])
def company_activities(company_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Activity).where(Activity.company_id == company_id).order_by(Activity.id.desc())
    ).all()
