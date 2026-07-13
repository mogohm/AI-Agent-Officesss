"""Business logic for companies (buildings)."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from api.models import Company, Department, Project
from api.schemas import CompanyCreate, CompanyUpdate


def list_companies(session: Session) -> list[dict]:
    companies = session.exec(select(Company).order_by(Company.id)).all()
    out: list[dict] = []
    for c in companies:
        dept_count = session.exec(
            select(func.count()).select_from(Department).where(Department.company_id == c.id)
        ).one()
        proj_count = session.exec(
            select(func.count()).select_from(Project).where(Project.company_id == c.id)
        ).one()
        out.append({
            "id": c.id, "name": c.name, "description": c.description, "emoji": c.emoji,
            "status": c.status, "theme_color": c.theme_color,
            "department_count": dept_count, "project_count": proj_count,
        })
    return out


def get_company(session: Session, company_id: int) -> Company:
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


def create_company(session: Session, data: CompanyCreate) -> Company:
    company = Company(**data.model_dump())
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def update_company(session: Session, company_id: int, data: CompanyUpdate) -> Company:
    company = get_company(session, company_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(company, key, value)
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def delete_company(session: Session, company_id: int) -> None:
    company = get_company(session, company_id)
    # Cascade cleanup of children (kept explicit; no ON DELETE in SQLite dev).
    for model in (Department, Project):
        rows = session.exec(select(model).where(model.company_id == company_id)).all()
        for row in rows:
            session.delete(row)
    session.delete(company)
    session.commit()
