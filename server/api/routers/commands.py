from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.db.database import get_session
from api.models import Command
from api.schemas import CommandCreate
from api.services import command_service

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.post("", response_model=Command)
async def create_command(data: CommandCreate, session: Session = Depends(get_session)):
    return await command_service.handle_command(session, data)


@router.get("/history", response_model=list[Command])
def command_history(session: Session = Depends(get_session)):
    return command_service.history(session)
