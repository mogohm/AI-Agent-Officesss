"""Pydantic request schemas (create/update payloads).

Responses use the SQLModel table objects directly (FastAPI serializes them),
so we only need explicit schemas for inbound data and a few computed outputs.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# --- Companies --------------------------------------------------------------
class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    emoji: str = "🏢"
    status: str = "active"
    theme_color: str = "#5B8CFF"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    emoji: Optional[str] = None
    status: Optional[str] = None
    theme_color: Optional[str] = None


class CompanyOut(BaseModel):
    """Company plus computed counts for the overview cards."""
    id: int
    name: str
    description: str
    emoji: str
    status: str
    theme_color: str
    department_count: int
    project_count: int


# --- Departments ------------------------------------------------------------
class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: str = "IT / Dev"
    floor_number: int = Field(ge=1, le=15)
    job_description: str = ""
    responsibilities: list[str] = []
    theme_color: str = "#5B8CFF"
    room_style: str = "glass-office"
    assigned_ai_model_id: Optional[int] = None
    status: str = "active"


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    floor_number: Optional[int] = Field(default=None, ge=1, le=15)
    job_description: Optional[str] = None
    responsibilities: Optional[list[str]] = None
    theme_color: Optional[str] = None
    room_style: Optional[str] = None
    assigned_ai_model_id: Optional[int] = None
    status: Optional[str] = None


# --- AI models --------------------------------------------------------------
class AIModelCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    provider: str
    model_name: str
    display_name: str
    description: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    best_for: list[str] = []
    cost_level: str = "medium"
    speed_level: str = "medium"
    quality_level: str = "high"
    context_length: int = 128000
    supports_text: bool = True
    supports_image: bool = False
    supports_code: bool = True
    supports_file: bool = False
    status: str = "mock"


class AIModelUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    strengths: Optional[list[str]] = None
    weaknesses: Optional[list[str]] = None
    best_for: Optional[list[str]] = None
    cost_level: Optional[str] = None
    speed_level: Optional[str] = None
    quality_level: Optional[str] = None
    context_length: Optional[int] = None
    status: Optional[str] = None


# --- Agents -----------------------------------------------------------------
class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str = "Developer Agent"
    skills: list[str] = []
    personality: str = ""
    department_id: Optional[int] = None
    assigned_ai_model_id: Optional[int] = None
    avatar: str = "🧑‍💻"
    accent: str = "#5B8CFF"
    status: str = "idle"
    current_task: str = ""
    animation_state: str = "idle"


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[list[str]] = None
    personality: Optional[str] = None
    department_id: Optional[int] = None
    assigned_ai_model_id: Optional[int] = None
    avatar: Optional[str] = None
    accent: Optional[str] = None
    status: Optional[str] = None
    current_task: Optional[str] = None
    animation_state: Optional[str] = None


# --- Projects ---------------------------------------------------------------
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = ""
    type: str = "Web Application"
    status: str = "draft"
    priority: str = "medium"
    assigned_department_ids: list[int] = []
    assigned_agent_ids: list[int] = []
    github_repo_url: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_department_ids: Optional[list[int]] = None
    assigned_agent_ids: Optional[list[int]] = None
    github_repo_url: Optional[str] = None
    progress: Optional[int] = None


# --- Tasks ------------------------------------------------------------------
class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "backlog"
    assignee_agent_id: Optional[int] = None
    priority: str = "medium"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_agent_id: Optional[int] = None
    priority: Optional[str] = None


# --- Commands / VPS ---------------------------------------------------------
class CommandCreate(BaseModel):
    text: str
    company_id: Optional[int] = None


class RunCommandRequest(BaseModel):
    command: str


class RecommendationOut(BaseModel):
    department_type: str
    reason: str
    recommended_model_ids: list[int]
    recommended_providers: list[str]
