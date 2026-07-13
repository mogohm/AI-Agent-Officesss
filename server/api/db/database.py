"""Database engine + session helpers.

Uses SQLModel/SQLAlchemy. Works with SQLite (zero-config dev default) and
PostgreSQL (production) transparently — only the DATABASE_URL changes.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from api.config import settings

# SQLite needs check_same_thread=False for FastAPI's threadpool.
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    # Import models so SQLModel.metadata is populated before create_all.
    import api.models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    # expire_on_commit=False keeps ORM objects usable after a commit. Several
    # endpoints commit more than once per request (e.g. update a row, then
    # record an activity); without this the first object's attributes would be
    # expired and FastAPI would serialize it as `{}`.
    with Session(engine, expire_on_commit=False) as session:
        yield session
