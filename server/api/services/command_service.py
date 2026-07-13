"""Command Center — mock natural-language intent parsing (Thai/English).

This is deliberately a small, transparent rule-based parser. It is the seam
where a real LLM intent router will live later (see the `# FUTURE:` note). For
now it detects an intent, performs a mock side effect, records an activity, and
returns a friendly response.
"""
from __future__ import annotations

import re

from sqlmodel import Session, select

from api.models import Command, Company, Department, Project
from api.schemas import CommandCreate
from api.services import activity_service

# (intent, [keyword patterns]) — order matters; first match wins.
INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("create_company", [r"สร้างบริษัท", r"create company", r"new company"]),
    ("create_department", [r"เพิ่มแผนก", r"สร้างแผนก", r"add department", r"new department"]),
    ("create_project", [r"สร้างโปรเจกต์", r"สร้างโปรเจค", r"create project", r"new project"]),
    ("start_dev", [r"ทีม dev", r"เริ่มสร้างโครงสร้าง", r"start dev", r"scaffold"]),
    ("design_ui", [r"ออกแบบ ui", r"design ui", r"ให้ design"]),
    ("qa_review", [r"ให้ qa", r"ตรวจงาน", r"qa review", r"test"]),
]


def _detect_intent(text: str) -> str:
    lowered = text.lower()
    for intent, patterns in INTENT_PATTERNS:
        if any(re.search(p, lowered) for p in patterns):
            return intent
    return "unknown"


def _extract_name(text: str) -> str:
    """Best-effort name extraction after 'ชื่อ' / 'named' / trailing quote."""
    m = re.search(r"(?:ชื่อ|named|name)\s+(.+)$", text, flags=re.IGNORECASE)
    if m:
        return m.group(1).strip().strip('"').strip("'")
    # fall back to the tail after common verbs
    m = re.search(r"(?:โปรเจกต์|โปรเจค|project|แผนก|department|บริษัท|company)\s+(.+)$", text, flags=re.IGNORECASE)
    return m.group(1).strip() if m else ""


async def handle_command(session: Session, data: CommandCreate) -> Command:
    intent = _detect_intent(data.text)
    name = _extract_name(data.text)
    company_id = data.company_id
    response = ""
    meta: dict = {"intent": intent, "extracted_name": name}

    # FUTURE: replace this block with an LLM call that returns a structured
    # tool-call, then execute the same service functions used elsewhere.
    if intent == "create_company":
        company = Company(name=name or "New Company", description="Created via Command Center")
        session.add(company)
        session.commit()
        session.refresh(company)
        company_id = company.id
        meta["company_id"] = company.id
        response = f"🏢 สร้างบริษัท '{company.name}' เรียบร้อยแล้ว"

    elif intent == "create_department" and company_id:
        count = len(session.exec(select(Department).where(Department.company_id == company_id)).all())
        floor = count + 1
        dept = Department(company_id=company_id, name=name or "New Department",
                          type=name or "IT / Dev", floor_number=min(floor, 15))
        session.add(dept)
        session.commit()
        session.refresh(dept)
        meta["department_id"] = dept.id
        response = f"🏬 เพิ่มแผนก '{dept.name}' ที่ชั้น {dept.floor_number}"

    elif intent == "create_project" and company_id:
        project = Project(company_id=company_id, name=name or "New Project",
                          type="Game" if "เกม" in data.text or "game" in data.text.lower() else "Web Application",
                          status="planning")
        session.add(project)
        session.commit()
        session.refresh(project)
        meta["project_id"] = project.id
        response = f"🚀 สร้างโปรเจกต์ '{project.name}' (สถานะ: planning)"

    elif intent == "start_dev":
        response = "👨‍💻 ทีม Dev เริ่มสร้างโครงสร้างโปรเจกต์แล้ว (mock)"
    elif intent == "design_ui":
        response = "🎨 ทีม Design กำลังออกแบบ UI (mock)"
    elif intent == "qa_review":
        response = "🕵️ ทีม QA กำลังตรวจงานล่าสุด (mock)"
    else:
        response = "🤔 ยังไม่เข้าใจคำสั่งนี้ ลองพิมพ์เช่น 'สร้างบริษัทใหม่ชื่อ AI Studio'"

    command = Command(company_id=company_id, text=data.text, detected_intent=intent,
                      response=response, meta=meta)
    session.add(command)
    session.commit()
    session.refresh(command)

    await activity_service.record(
        session, message=f"Command: {data.text}", action="command",
        status="info", company_id=company_id,
    )
    return command


def history(session: Session, limit: int = 50) -> list[Command]:
    return session.exec(
        select(Command).order_by(Command.id.desc()).limit(limit)
    ).all()
