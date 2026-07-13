"""FastAPI application entrypoint.

Run (from the server/ directory):
    uvicorn api.main:app --reload --port 8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.db.database import create_db_and_tables
from api.db.seed import seed_if_empty
from api.routers import (
    activities, agents, ai_models, commands, companies, departments,
    meta, projects, tasks, vps, ws,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    if settings.auto_seed:
        seed_if_empty()
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"ok": True, "app": settings.app_name, "version": settings.app_version, "engine": "mock"}


for r in (
    companies.router, departments.router, ai_models.router, agents.router,
    projects.router, tasks.router, activities.router, commands.router,
    vps.router, meta.router, ws.router,
):
    app.include_router(r)
