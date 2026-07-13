"""AI model CRUD + recommendations (mock)."""
from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, select

from api.models import AIModel
from api.schemas import AIModelCreate, AIModelUpdate, RecommendationOut
from api.utils.recommendations import recommend_for_department_type


def list_models(session: Session) -> list[AIModel]:
    return session.exec(select(AIModel).order_by(AIModel.id)).all()


def get_model(session: Session, model_id: int) -> AIModel:
    model = session.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")
    return model


def create_model(session: Session, data: AIModelCreate) -> AIModel:
    model = AIModel(**data.model_dump())
    session.add(model)
    session.commit()
    session.refresh(model)
    return model


def update_model(session: Session, model_id: int, data: AIModelUpdate) -> AIModel:
    model = get_model(session, model_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    session.add(model)
    session.commit()
    session.refresh(model)
    return model


def delete_model(session: Session, model_id: int) -> None:
    model = get_model(session, model_id)
    session.delete(model)
    session.commit()


def recommend(session: Session, department_type: str) -> RecommendationOut:
    rule = recommend_for_department_type(department_type)
    providers: list[str] = rule["providers"]
    models = session.exec(select(AIModel).where(AIModel.provider.in_(providers))).all()
    # Preserve the priority order defined in the rule.
    order = {p: i for i, p in enumerate(providers)}
    models.sort(key=lambda m: order.get(m.provider, 99))
    return RecommendationOut(
        department_type=department_type,
        reason=rule["reason"],
        recommended_model_ids=[m.id for m in models],
        recommended_providers=providers,
    )
