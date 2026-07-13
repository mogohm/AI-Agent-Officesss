from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from api.db.database import get_session
from api.models import Task
from api.schemas import TaskCreate, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/api/projects/{project_id}/tasks", response_model=list[Task])
def list_tasks(project_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Task).where(Task.project_id == project_id).order_by(Task.id)).all()


@router.post("/api/projects/{project_id}/tasks", response_model=Task, status_code=201)
def create_task(project_id: int, data: TaskCreate, session: Session = Depends(get_session)):
    task = Task(project_id=project_id, **data.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, data: TaskUpdate, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if task:
        session.delete(task)
        session.commit()
