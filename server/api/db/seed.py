"""Idempotent demo seeding — mirrors the approved reference mock.

Runs on startup when AUTO_SEED is on and the DB has no companies. Seeds four
companies (COMPANY A–D). COMPANY A matches the reference exactly: six floors
(Marketing / Sales / HR / IT-Dev / Design-Meeting / Lobby-Support) and four
projects (Alpha / Beta / Gamma / Delta).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, select

from api.db.database import engine
from api.models import (
    Activity, Agent, AIModel, Company, Department, Project, ProjectFile,
    Task, VPSWorkspace,
)


def _d(y: int, m: int, day: int) -> datetime:
    return datetime(y, m, day, 9, 0, 0, tzinfo=timezone.utc)


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

# Reference COMPANY A floors (floor: type, name, theme_color) — colours match
# the reference floor tabs. `type` resolves to a Bright floor module on the web.
COMPANY_A_DEPTS = [
    (6, "Marketing", "Marketing", "#7B5BD6"),
    (5, "Sales", "Sales", "#2E7BC4"),
    (4, "HR", "HR", "#C94F6E"),
    (3, "IT / Dev", "IT / Dev", "#2F9BB0"),
    (2, "Design", "Design / Meeting", "#D98A3D"),
    (1, "Lobby / Support", "Lobby / Support", "#3E9E5F"),
]

# Generic office department pool for the other companies (types reuse the same
# Bright modules so every floor renders furnished art).
DEPT_POOL = [
    ("Marketing", "Marketing", "#7B5BD6"), ("Sales", "Sales", "#2E7BC4"),
    ("HR", "HR", "#C94F6E"), ("IT / Dev", "Engineering", "#2F9BB0"),
    ("Design", "Design", "#D98A3D"), ("Lobby / Support", "Support", "#3E9E5F"),
    ("Product Management", "Product", "#5B8CFF"), ("QA / Tester", "Quality", "#2F9BB0"),
]


def _seed_models(session: Session) -> dict[str, int]:
    ids: dict[str, int] = {}
    for data in MOCK_MODELS:
        model = AIModel(**data)
        session.add(model); session.commit(); session.refresh(model)
        ids[model.provider] = model.id
    return ids


def _company(session: Session, name: str, subtitle: str, emoji: str, color: str) -> Company:
    c = Company(name=name, emoji=emoji, description=subtitle, theme_color=color)
    session.add(c); session.commit(); session.refresh(c)
    return c


# Thai responsibilities per department type (matches the reference Job Description).
RESP_TH: dict[str, list[str]] = {
    "IT / Dev": ["พัฒนาและบำรุงรักษาแอปพลิเคชัน", "ออกแบบฐานข้อมูลและ API",
                 "แก้ไขบั๊กและปรับปรุงระบบ", "ทำงานร่วมกับทีมอื่น"],
    "Marketing": ["วางแผนแคมเปญการตลาด", "วิเคราะห์กลุ่มเป้าหมาย", "สร้างคอนเทนต์และโฆษณา"],
    "Sales": ["ติดตามและดูแลลูกค้า", "เขียนสคริปต์การขาย", "ปิดการขายและทำรายงาน"],
    "HR": ["คัดกรองและสัมภาษณ์ผู้สมัคร", "ดูแลสวัสดิการพนักงาน", "จัดอบรมและพัฒนาทีม"],
    "Design": ["ออกแบบ UI/UX", "ทำภาพและแอสเซ็ต", "ดูแลแนวทางการออกแบบ"],
    "Lobby / Support": ["ต้อนรับและช่วยเหลือผู้ใช้", "ตอบคำถามและแก้ปัญหา", "ประสานงานกับทีมที่เกี่ยวข้อง"],
}


def _dept(session: Session, company_id: int, floor: int, dtype: str, name: str,
          color: str, model_id: int | None = None) -> Department:
    d = Department(company_id=company_id, name=name, type=dtype, floor_number=floor,
                   theme_color=color, assigned_ai_model_id=model_id,
                   responsibilities=RESP_TH.get(dtype, ["กำหนดขอบเขตงาน", "ส่งมอบงานคุณภาพ", "ทำงานร่วมกับทีม"]))
    session.add(d); session.commit(); session.refresh(d)
    return d


def seed_if_empty() -> None:
    with Session(engine) as session:
        if session.exec(select(Company)).first():
            return  # already seeded

        m = _seed_models(session)

        # ===== COMPANY A — matches the reference mock exactly =====
        a = _company(session, "COMPANY A", "AI Solutions Co., Ltd.", "🏢", "#3E70C9")
        a_dept: dict[str, int] = {}
        prov = {"Marketing": "google", "Sales": "openai", "HR": "anthropic",
                "IT / Dev": "anthropic", "Design": "image", "Lobby / Support": "local"}
        for floor, dtype, name, color in COMPANY_A_DEPTS:
            d = _dept(session, a.id, floor, dtype, name, color, m.get(prov.get(dtype, "openai")))
            a_dept[dtype] = d.id

        agents_spec = [
            ("Echo", "Marketing Agent", "Marketing", "📣", "#7B5BD6", "writing"),
            ("Sol", "Sales Agent", "Sales", "💼", "#2E7BC4", "planning"),
            ("Hera", "HR Agent", "HR", "🧑‍💼", "#C94F6E", "reviewing"),
            ("Byte", "Backend Developer Agent", "IT / Dev", "👨‍💻", "#2F9BB0", "coding"),
            ("Ada", "Frontend Developer Agent", "IT / Dev", "👩‍💻", "#2F9BB0", "coding"),
            ("Pixel", "UI/UX Designer Agent", "Design", "👩‍🎨", "#D98A3D", "designing"),
            ("Ln", "Support Agent", "Lobby / Support", "🎧", "#3E9E5F", "idle"),
        ]
        a_agents: list[int] = []
        for name, role, dtype, avatar, accent, status in agents_spec:
            ag = Agent(company_id=a.id, department_id=a_dept.get(dtype), name=name, role=role,
                       avatar=avatar, accent=accent, status=status, animation_state=status,
                       skills=["Teamwork", "AI"], current_task=f"Working in {dtype}")
            session.add(ag); session.commit(); session.refresh(ag)
            a_agents.append(ag.id)

        projects_spec = [
            ("Project Alpha", "ระบบแชท AI สำหรับลูกค้า", "AI Application", "in_progress", "high", 62,
             _d(2024, 5, 10), [a_dept["IT / Dev"], a_dept["Design"], a_dept["Marketing"]], a_agents[:5], "running"),
            ("Project Beta", "AI Data Analysis Dashboard", "Data / Analytics", "in_progress", "high", 48,
             _d(2024, 5, 5), [a_dept["IT / Dev"], a_dept["Sales"]], [a_agents[1], a_agents[3]], "running"),
            ("Project Gamma", "AI Content Generator", "AI Application", "draft", "medium", 5,
             _d(2024, 5, 1), [a_dept["Marketing"], a_dept["Design"]], [a_agents[0], a_agents[5]], "stopped"),
            ("Project Delta", "Internal HR Assistant", "Internal Tool", "archived", "low", 100,
             _d(2024, 4, 20), [a_dept["HR"]], [a_agents[2]], "stopped"),
        ]
        first_project = None
        for name, desc, ptype, status, prio, prog, created, depts, ags, vps in projects_spec:
            p = Project(company_id=a.id, name=name, description=desc, type=ptype, status=status,
                        priority=prio, progress=prog, assigned_department_ids=depts,
                        assigned_agent_ids=ags, created_at=created, updated_at=created,
                        workspace_path=f"/workspaces/companies/company-a/{name.lower().replace(' ', '-')}",
                        vps_status=vps)
            session.add(p); session.commit(); session.refresh(p)
            if first_project is None:
                first_project = p

        # workspace + files + tasks + activity for the flagship project
        session.add(VPSWorkspace(project_id=first_project.id, path=first_project.workspace_path,
                                 status="running", cpu_percent=14.0, memory_mb=640, disk_mb=2100))
        for path, kind, lang, preview in [
            ("/src", "dir", "", ""), ("/src/main.ts", "file", "typescript", "// chat entrypoint"),
            ("/docs/SPEC.md", "file", "markdown", "# Product Spec"), ("README.md", "file", "markdown", "# Project Alpha"),
        ]:
            session.add(ProjectFile(project_id=first_project.id, path=path, kind=kind, language=lang, preview=preview))
        for title, status, aid in [
            ("Draft product spec", "done", a_agents[0]),
            ("Build chat backend", "in_progress", a_agents[3]),
            ("Design chat UI", "in_progress", a_agents[5]),
            ("Set up analytics", "backlog", a_agents[1]),
        ]:
            session.add(Task(project_id=first_project.id, title=title, status=status, assignee_agent_id=aid))
        for idx, action, message in [
            (0, "created", "Marketing Agent drafted the campaign brief"),
            (3, "coding", "Dev Agent scaffolded the chat service"),
            (5, "designing", "Design Agent shipped the chat mockups"),
        ]:
            session.add(Activity(company_id=a.id, project_id=first_project.id, agent_id=a_agents[idx],
                                 action=action, status="info", message=message))
        session.commit()

        # ===== COMPANY B / C / D — building thumbnails + dept counts like the reference =====
        others = [
            ("COMPANY B", "DataCraft Co., Ltd.", "🏢", "#2F9BB0", 8),
            ("COMPANY C", "Creative Minds Co., Ltd.", "🏢", "#C75FA4", 5),
            ("COMPANY D", "NextGen Tech Co., Ltd.", "🏢", "#5B6FD6", 7),
        ]
        for name, subtitle, emoji, color, n in others:
            c = _company(session, name, subtitle, emoji, color)
            for floor in range(1, n + 1):
                dtype, dname, dcolor = DEPT_POOL[(floor - 1) % len(DEPT_POOL)]
                _dept(session, c.id, floor, dtype, dname, dcolor)
        session.commit()
