from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from api.db.database import get_session
from api.models import AIModel
from api.schemas import AIModelCreate, AIModelUpdate, RecommendationOut
from api.services import ai_model_service

router = APIRouter(prefix="/api/ai-models", tags=["ai-models"])


@router.get("", response_model=list[AIModel])
def list_models(session: Session = Depends(get_session)):
    return ai_model_service.list_models(session)


@router.post("", response_model=AIModel, status_code=201)
def create_model(data: AIModelCreate, session: Session = Depends(get_session)):
    return ai_model_service.create_model(session, data)


# NOTE: /recommend must be declared before /{model_id} to avoid path capture.
@router.get("/recommend", response_model=RecommendationOut)
def recommend(department_type: str = Query(...), session: Session = Depends(get_session)):
    return ai_model_service.recommend(session, department_type)


@router.put("/{model_id}", response_model=AIModel)
def update_model(model_id: int, data: AIModelUpdate, session: Session = Depends(get_session)):
    return ai_model_service.update_model(session, model_id, data)


@router.delete("/{model_id}", status_code=204)
def delete_model(model_id: int, session: Session = Depends(get_session)):
    ai_model_service.delete_model(session, model_id)
