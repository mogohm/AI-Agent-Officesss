"""Shared enumerations and constant option lists.

Kept as plain strings (not Python Enum tables) so they serialize cleanly to
JSON and match the TypeScript unions on the frontend one-to-one.
"""
from __future__ import annotations

MAX_DEPARTMENTS = 15

DEPARTMENT_TYPES = [
    "Lobby / Support",
    "Marketing",
    "Sales",
    "HR",
    "IT / Dev",
    "Design",
    "Game Studio",
    "QA / Tester",
    "Data / Research",
    "Finance",
    "Legal",
    "Content",
    "DevOps",
    "Product Management",
    "Customer Service",
]

AGENT_ROLES = [
    "Project Manager Agent",
    "Business Analyst Agent",
    "System Analyst Agent",
    "Developer Agent",
    "Frontend Developer Agent",
    "Backend Developer Agent",
    "Database Agent",
    "UI/UX Designer Agent",
    "Game Designer Agent",
    "QA Tester Agent",
    "DevOps Agent",
    "Research Agent",
    "Marketing Agent",
    "Sales Agent",
    "HR Agent",
    "Document Agent",
]

AGENT_STATUSES = [
    "idle", "thinking", "planning", "coding", "designing", "writing",
    "reviewing", "testing", "meeting", "waiting", "done", "error",
]

PROJECT_TYPES = [
    "Web Application", "Mobile App", "Game", "Dashboard", "Automation",
    "Scraper", "AI Tool", "Business System", "Report System",
    "Design Project", "Document Project",
]

PROJECT_STATUSES = [
    "draft", "planning", "in_progress", "reviewing", "testing",
    "completed", "archived", "failed", "paused",
]

# Idle "life simulation" activities, surfaced to the animation layer.
IDLE_ACTIVITIES = [
    "drinking coffee", "reading book", "chatting with other AI",
    "playing small game", "relaxing on sofa", "looking outside window",
    "cleaning desk",
]
