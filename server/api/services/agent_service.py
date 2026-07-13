"""Business logic for agents (AI office workers)."""
from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, select

from api.models import Agent
from api.schemas import AgentCreate, AgentUpdate


def list_agents(session: Session, company_id: int) -> list[Agent]:
    return session.exec(
        select(Agent).where(Agent.company_id == company_id).order_by(Agent.id)
    ).all()


def get_agent(session: Session, agent_id: int) -> Agent:
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


def create_agent(session: Session, company_id: int, data: AgentCreate) -> Agent:
    agent = Agent(company_id=company_id, **data.model_dump())
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


def update_agent(session: Session, agent_id: int, data: AgentUpdate) -> Agent:
    agent = get_agent(session, agent_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


def delete_agent(session: Session, agent_id: int) -> None:
    agent = get_agent(session, agent_id)
    session.delete(agent)
    session.commit()
