from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.db.database import get_session
from api.models import Department
from api.schemas import DepartmentCreate, DepartmentUpdate
from api.services import department_service

router = APIRouter(tags=["departments"])


@router.get("/api/companies/{company_id}/departments", response_model=list[Department])
def list_departments(company_id: int, session: Session = Depends(get_session)):
    return department_service.list_departments(session, company_id)


@router.post("/api/companies/{company_id}/departments", response_model=Department, status_code=201)
def create_department(company_id: int, data: DepartmentCreate, session: Session = Depends(get_session)):
    return department_service.create_department(session, company_id, data)


@router.get("/api/departments/{department_id}", response_model=Department)
def get_department(department_id: int, session: Session = Depends(get_session)):
    return department_service.get_department(session, department_id)


@router.get("/api/departments/{department_id}/usage")
def department_usage(department_id: int, session: Session = Depends(get_session)):
    return department_service.department_usage(session, department_id)


@router.put("/api/departments/{department_id}", response_model=Department)
def update_department(department_id: int, data: DepartmentUpdate, session: Session = Depends(get_session)):
    return department_service.update_department(session, department_id, data)


@router.delete("/api/departments/{department_id}", status_code=204)
def delete_department(department_id: int, session: Session = Depends(get_session)):
    department_service.delete_department(session, department_id)
