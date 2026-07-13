from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.db.database import get_session
from api.models import Company
from api.schemas import CompanyCreate, CompanyOut, CompanyUpdate
from api.services import company_service

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("", response_model=list[CompanyOut])
def list_companies(session: Session = Depends(get_session)):
    return company_service.list_companies(session)


@router.post("", response_model=Company, status_code=201)
def create_company(data: CompanyCreate, session: Session = Depends(get_session)):
    return company_service.create_company(session, data)


@router.get("/{company_id}", response_model=Company)
def get_company(company_id: int, session: Session = Depends(get_session)):
    return company_service.get_company(session, company_id)


@router.put("/{company_id}", response_model=Company)
def update_company(company_id: int, data: CompanyUpdate, session: Session = Depends(get_session)):
    return company_service.update_company(session, company_id, data)


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: int, session: Session = Depends(get_session)):
    company_service.delete_company(session, company_id)
