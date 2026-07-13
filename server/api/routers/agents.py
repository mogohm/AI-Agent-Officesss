from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.db.database import get_session
from api.models import Agent
from api.schemas import AgentCreate, AgentUpdate
from api.services import agent_service

router = APIRouter(tags=["agents"])


@router.get("/api/companies/{company_id}/agents", response_model=list[Agent])
def list_agents(company_id: int, session: Session = Depends(get_session)):
    return agent_service.list_agents(session, company_id)


@router.post("/api/companies/{company_id}/agents", response_model=Agent, status_code=201)
def create_agent(company_id: int, data: AgentCreate, session: Session = Depends(get_session)):
    return agent_service.create_agent(session, company_id, data)


@router.put("/api/agents/{agent_id}", response_model=Agent)
def update_agent(agent_id: int, data: AgentUpdate, session: Session = Depends(get_session)):
    return agent_service.update_agent(session, agent_id, data)


@router.delete("/api/agents/{agent_id}", status_code=204)
def delete_agent(agent_id: int, session: Session = Depends(get_session)):
    agent_service.delete_agent(session, agent_id)
