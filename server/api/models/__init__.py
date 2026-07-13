"""SQLModel table definitions for AI Agent Office.

One module keeps the relational picture readable. JSON columns are used for
list/dict fields (skills, responsibilities, assigned agents, etc.) so the schema
stays flexible during MVP without extra join tables.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin(SQLModel):
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class User(TimestampMixin, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    display_name: str = ""
    role: str = "owner"  # owner | admin | member


class Company(TimestampMixin, table=True):
    __tablename__ = "companies"
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    name: str = Field(index=True)
    description: str = ""
    emoji: str = "🏢"
    status: str = "active"  # active | paused | archived
    theme_color: str = "#5B8CFF"


class Department(TimestampMixin, table=True):
    __tablename__ = "departments"
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    name: str
    type: str = "IT / Dev"
    floor_number: int = 1
    job_description: str = ""
    responsibilities: list = Field(default_factory=list, sa_column=Column(JSON))
    theme_color: str = "#5B8CFF"
    room_style: str = "glass-office"
    assigned_ai_model_id: Optional[int] = Field(default=None, foreign_key="ai_models.id")
    status: str = "active"


class AIModel(TimestampMixin, table=True):
    __tablename__ = "ai_models"
    # `model_name` would otherwise collide with pydantic's protected "model_" namespace.
    model_config = {"protected_namespaces": ()}  # type: ignore[assignment]
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str  # openai | anthropic | google | local | image
    model_name: str
    display_name: str
    description: str = ""
    strengths: list = Field(default_factory=list, sa_column=Column(JSON))
    weaknesses: list = Field(default_factory=list, sa_column=Column(JSON))
    best_for: list = Field(default_factory=list, sa_column=Column(JSON))
    cost_level: str = "medium"    # low | medium | high
    speed_level: str = "medium"   # slow | medium | fast
    quality_level: str = "high"   # low | medium | high
    context_length: int = 128000
    supports_text: bool = True
    supports_image: bool = False
    supports_code: bool = True
    supports_file: bool = False
    status: str = "active"  # active | beta | deprecated | mock


class Agent(TimestampMixin, table=True):
    __tablename__ = "agents"
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    department_id: Optional[int] = Field(default=None, foreign_key="departments.id")
    assigned_ai_model_id: Optional[int] = Field(default=None, foreign_key="ai_models.id")
    name: str
    role: str = "Developer Agent"
    skills: list = Field(default_factory=list, sa_column=Column(JSON))
    personality: str = ""
    avatar: str = "🧑‍💻"
    accent: str = "#5B8CFF"
    status: str = "idle"
    current_task: str = ""
    animation_state: str = "idle"


class Project(TimestampMixin, table=True):
    __tablename__ = "projects"
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    name: str
    description: str = ""
    type: str = "Web Application"
    status: str = "draft"
    priority: str = "medium"  # low | medium | high
    assigned_department_ids: list = Field(default_factory=list, sa_column=Column(JSON))
    assigned_agent_ids: list = Field(default_factory=list, sa_column=Column(JSON))
    workspace_path: str = ""
    github_repo_url: str = ""
    vps_status: str = "not_provisioned"  # not_provisioned | provisioning | running | stopped
    progress: int = 0


class Task(TimestampMixin, table=True):
    __tablename__ = "tasks"
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    title: str
    description: str = ""
    status: str = "backlog"  # backlog | in_progress | review | done
    assignee_agent_id: Optional[int] = Field(default=None, foreign_key="agents.id")
    priority: str = "medium"


class ProjectFile(TimestampMixin, table=True):
    __tablename__ = "project_files"
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    path: str
    kind: str = "file"  # file | dir
    language: str = ""
    preview: str = ""
    size_bytes: int = 0


class Activity(TimestampMixin, table=True):
    __tablename__ = "activities"
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: Optional[int] = Field(default=None, foreign_key="companies.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id", index=True)
    department_id: Optional[int] = Field(default=None, foreign_key="departments.id")
    agent_id: Optional[int] = Field(default=None, foreign_key="agents.id")
    action: str = "system"
    status: str = "info"
    message: str = ""
    related_file: str = ""


class VPSWorkspace(TimestampMixin, table=True):
    __tablename__ = "vps_workspaces"
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    path: str
    status: str = "created"  # created | running | stopped | error
    cpu_percent: float = 0.0
    memory_mb: int = 0
    disk_mb: int = 0


class Command(TimestampMixin, table=True):
    __tablename__ = "commands"
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: Optional[int] = Field(default=None, foreign_key="companies.id")
    text: str = ""
    detected_intent: str = ""
    response: str = ""
    meta: dict = Field(default_factory=dict, sa_column=Column(JSON))


class Setting(TimestampMixin, table=True):
    __tablename__ = "settings"
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str = ""


__all__ = [
    "User", "Company", "Department", "AIModel", "Agent", "Project", "Task",
    "ProjectFile", "Activity", "VPSWorkspace", "Command", "Setting",
]
