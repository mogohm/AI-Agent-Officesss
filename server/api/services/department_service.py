"""Business logic for departments (floors), incl. the max-15 rule."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from api.models import Agent, Department, Project
from api.schemas import DepartmentCreate, DepartmentUpdate
from api.utils.enums import MAX_DEPARTMENTS


def list_departments(session: Session, company_id: int) -> list[Department]:
    return session.exec(
        select(Department)
        .where(Department.company_id == company_id)
        .order_by(Department.floor_number)
    ).all()


def get_department(session: Session, department_id: int) -> Department:
    dept = session.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


def _assert_floor_unique(session: Session, company_id: int, floor: int, exclude_id: int | None = None) -> None:
    stmt = select(Department).where(
        Department.company_id == company_id, Department.floor_number == floor
    )
    existing = session.exec(stmt).first()
    if existing and existing.id != exclude_id:
        raise HTTPException(
            status_code=409,
            detail=f"Floor {floor} is already used by department '{existing.name}'.",
        )


def create_department(session: Session, company_id: int, data: DepartmentCreate) -> Department:
    count = session.exec(
        select(func.count()).select_from(Department).where(Department.company_id == company_id)
    ).one()
    if count >= MAX_DEPARTMENTS:
        raise HTTPException(
            status_code=422,
            detail=f"A company can have at most {MAX_DEPARTMENTS} departments / floors.",
        )
    _assert_floor_unique(session, company_id, data.floor_number)

    dept = Department(company_id=company_id, **data.model_dump())
    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept


def update_department(session: Session, department_id: int, data: DepartmentUpdate) -> Department:
    dept = get_department(session, department_id)
    payload = data.model_dump(exclude_unset=True)
    if "floor_number" in payload and payload["floor_number"] != dept.floor_number:
        _assert_floor_unique(session, dept.company_id, payload["floor_number"], exclude_id=dept.id)
    for key, value in payload.items():
        setattr(dept, key, value)
    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept


def department_usage(session: Session, department_id: int) -> dict:
    """Counts used to warn the user before deleting a populated department."""
    agents = session.exec(
        select(func.count()).select_from(Agent).where(Agent.department_id == department_id)
    ).one()
    dept = get_department(session, department_id)
    projects = session.exec(
        select(Project).where(Project.company_id == dept.company_id)
    ).all()
    linked_projects = sum(1 for p in projects if department_id in (p.assigned_department_ids or []))
    return {"agents": agents, "projects": linked_projects}


def delete_department(session: Session, department_id: int) -> None:
    dept = get_department(session, department_id)
    # Detach agents rather than deleting them (they can be reassigned).
    agents = session.exec(select(Agent).where(Agent.department_id == department_id)).all()
    for agent in agents:
        agent.department_id = None
        session.add(agent)
    session.delete(dept)
    session.commit()
