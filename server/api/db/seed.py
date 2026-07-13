"""Idempotent demo seeding.

Runs on startup when AUTO_SEED is on and the DB has no companies. Mirrors
database/seed.sql so the app looks alive whether you seed via Python or raw SQL.
"""
from __future__ import annotations

from sqlmodel import Session, select

from api.db.database import engine
from api.models import (
    Activity, Agent, AIModel, Company, Department, Project, ProjectFile,
    Task, VPSWorkspace,
)

MOCK_MODELS = [
    dict(provider="openai", model_name="gpt-4o", display_name="GPT-4o (OpenAI)",
         description="Versatile flagship model. Great all-rounder.",
         strengths=["Reasoning", "Coding", "Writing"], weaknesses=["Cost at scale"],
         best_for=["Coding", "Marketing", "Sales", "HR"], cost_level="medium",
         speed_level="fast", quality_level="high", context_length=128000,
         supports_image=True, supports_file=True, status="mock"),
    dict(provider="anthropic", model_name="claude-3-5-sonnet", display_name="Claude 3.5 (Anthropic)",
         description="Strong reasoning and long-context coding partner.",
         strengths=["Architecture", "Long context", "Careful reasoning"],
         weaknesses=["No native image gen"], best_for=["Coding", "QA", "Research", "HR"],
         cost_level="medium", speed_level="medium", quality_level="high",
         context_length=200000, supports_file=True, status="mock"),
    dict(provider="google", model_name="gemini-1.5-pro", display_name="Gemini 1.5 (Google)",
         description="Huge context window, good for research and analysis.",
         strengths=["Massive context", "Research", "Summarization"],
         weaknesses=["Coding depth"], best_for=["Data / Research", "Marketing"],
         cost_level="low", speed_level="fast", quality_level="high",
         context_length=1000000, supports_image=True, supports_file=True, status="mock"),
    dict(provider="local", model_name="llama-3-70b", display_name="Local LLM (Llama 3)",
         description="Self-hosted model for private, offline workloads.",
         strengths=["Privacy", "No API cost", "Offline"], weaknesses=["Needs GPU", "Lower quality"],
         best_for=["Coding", "Internal tools"], cost_level="low", speed_level="medium",
         quality_level="medium", context_length=32000, status="mock"),
    dict(provider="image", model_name="image-ai-xl", display_name="Image AI (Diffusion XL)",
         description="Generates concept art, UI mockups, and game assets.",
         strengths=["Concept art", "Assets", "Mockups"], weaknesses=["No text reasoning"],
         best_for=["Design", "Game Studio"], cost_level="medium", speed_level="medium",
         quality_level="high", context_length=0, supports_text=False, supports_image=True,
         supports_code=False, status="mock"),
]


def _seed_models(session: Session) -> dict[str, int]:
    ids: dict[str, int] = {}
    for data in MOCK_MODELS:
        model = AIModel(**data)
        session.add(model)
        session.commit()
        session.refresh(model)
        ids[model.provider] = model.id
    return ids


def seed_if_empty() -> None:
    with Session(engine) as session:
        if session.exec(select(Company)).first():
            return  # already seeded

        model_ids = _seed_models(session)

        # --- Company A: AI Game Studio ---
        company = Company(name="AI Game Studio", emoji="🎮",
                          description="A studio building cute idle games with AI teams.",
                          theme_color="#A98BFF")
        session.add(company)
        session.commit()
        session.refresh(company)

        depts_spec = [
            ("Product Management", "Product Management", 1, "#5B8CFF", "anthropic"),
            ("Engineering", "IT / Dev", 2, "#5BE49B", "anthropic"),
            ("Art & Design", "Design", 3, "#FF7AC6", "image"),
            ("Game Studio", "Game Studio", 4, "#FFD166", "openai"),
            ("Quality", "QA / Tester", 5, "#3BE8E0", "anthropic"),
            ("Growth", "Marketing", 6, "#FF9F6B", "google"),
        ]
        dept_ids: dict[str, int] = {}
        for name, dtype, floor, color, provider in depts_spec:
            dept = Department(company_id=company.id, name=name, type=dtype,
                              floor_number=floor, theme_color=color,
                              assigned_ai_model_id=model_ids.get(provider),
                              responsibilities=["Define scope", "Deliver quality", "Collaborate"])
            session.add(dept)
            session.commit()
            session.refresh(dept)
            dept_ids[dtype] = dept.id

        agents_spec = [
            ("Nova", "Project Manager Agent", "Product Management", "🧑‍💼", "#5B8CFF", "planning"),
            ("Byte", "Backend Developer Agent", "IT / Dev", "👨‍💻", "#5BE49B", "coding"),
            ("Pixel", "UI/UX Designer Agent", "Design", "👩‍🎨", "#FF7AC6", "designing"),
            ("Quest", "Game Designer Agent", "Game Studio", "🕹️", "#FFD166", "thinking"),
            ("Scout", "QA Tester Agent", "QA / Tester", "🕵️", "#3BE8E0", "testing"),
            ("Echo", "Marketing Agent", "Marketing", "📣", "#FF9F6B", "writing"),
        ]
        agent_ids: list[int] = []
        for name, role, dtype, avatar, accent, status in agents_spec:
            agent = Agent(company_id=company.id, department_id=dept_ids.get(dtype),
                          name=name, role=role, avatar=avatar, accent=accent, status=status,
                          animation_state=status, skills=["Teamwork", "AI"],
                          current_task="Working on Idle City Builder")
            session.add(agent)
            session.commit()
            session.refresh(agent)
            agent_ids.append(agent.id)

        # --- Project ---
        project = Project(company_id=company.id, name="Idle City Builder",
                          description="A cozy idle game where AI builds a neon city.",
                          type="Game", status="in_progress", priority="high", progress=45,
                          assigned_department_ids=[dept_ids["IT / Dev"], dept_ids["Design"],
                                                   dept_ids["Game Studio"], dept_ids["QA / Tester"]],
                          assigned_agent_ids=agent_ids,
                          workspace_path="/workspaces/companies/ai-game-studio/idle-city-builder",
                          vps_status="running")
        session.add(project)
        session.commit()
        session.refresh(project)

        for path, kind, lang, preview in [
            ("/src", "dir", "", ""),
            ("/src/main.ts", "file", "typescript", "// idle loop entrypoint"),
            ("/docs/GDD.md", "file", "markdown", "# Game Design Document"),
            ("/assets", "dir", "", ""),
            ("README.md", "file", "markdown", "# Idle City Builder"),
            ("project.json", "file", "json", '{ "name": "idle-city-builder" }'),
        ]:
            session.add(ProjectFile(project_id=project.id, path=path, kind=kind,
                                    language=lang, preview=preview))

        session.add(VPSWorkspace(project_id=project.id, path=project.workspace_path,
                                 status="running", cpu_percent=12.5, memory_mb=512, disk_mb=1800))

        for title, status, aid in [
            ("Write Game Design Document", "done", agent_ids[3]),
            ("Build idle economy loop", "in_progress", agent_ids[1]),
            ("Design neon city tiles", "in_progress", agent_ids[2]),
            ("Test save/load", "backlog", agent_ids[4]),
        ]:
            session.add(Task(project_id=project.id, title=title, status=status, assignee_agent_id=aid))

        for agent_idx, action, message, f in [
            (0, "created", "PM Agent created the project plan", "/docs/GDD.md"),
            (1, "coding", "Dev Agent created Next.js structure", "/src/main.ts"),
            (2, "designing", "Design Agent updated UI concept", "/assets"),
            (4, "testing", "QA Agent found 2 issues", ""),
        ]:
            session.add(Activity(company_id=company.id, project_id=project.id,
                                 agent_id=agent_ids[agent_idx], action=action,
                                 status="info", message=message, related_file=f))

        # --- Company B (empty-ish, to show multiple buildings) ---
        company_b = Company(name="Neon Labs", emoji="🧪",
                            description="Automation & data tools powered by AI agents.",
                            theme_color="#3BE8E0")
        session.add(company_b)
        session.commit()
        session.refresh(company_b)
        for name, dtype, floor, color in [
            ("Support", "Lobby / Support", 1, "#5B8CFF"),
            ("Engineering", "IT / Dev", 2, "#5BE49B"),
            ("Research", "Data / Research", 3, "#A98BFF"),
        ]:
            session.add(Department(company_id=company_b.id, name=name, type=dtype,
                                   floor_number=floor, theme_color=color))
        session.commit()
