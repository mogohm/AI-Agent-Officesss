"""Pydantic schema for a creative task JSON."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

TaskStatus = Literal["pending", "running", "completed", "failed"]
TaskType = Literal["generate_image"]


class CreativeTask(BaseModel):
    task_id: str
    task_type: TaskType = "generate_image"
    status: TaskStatus = "pending"
    created_at: str | None = None
    updated_at: str | None = None

    asset_name: str
    prompt_source: str
    prompt_section: str
    prompt_suffix: str = ""

    reference_images: list[str] = Field(default_factory=list)

    output_path: str
    source_output_path: str

    expected_width: int
    expected_height: int
    aspect_ratio: str

    model: str = "gpt-image-1"
    quality: str = "high"

    crop_mode: str = "cover"
    focal_x: float = 0.5
    focal_y: float = 0.5

    transparency_requested: bool = False
    transparency_status: str = "pending_cleanup"

    visual_lab_url: str | None = None
    screenshot_after_generation: bool = True

    metadata: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None

    def model_dump_json_indented(self) -> str:
        return self.model_dump_json(indent=2)
