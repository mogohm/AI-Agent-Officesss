"""AI model recommendation rules (mock, rule-based).

This is the single seam where a smarter recommender (or a real routing model)
can be dropped in later. For MVP it is a static mapping from department type to
recommended providers plus a human-readable rationale.
"""
from __future__ import annotations

# provider keys must match ai_models.provider values in the seed data.
RECOMMENDATION_RULES: dict[str, dict] = {
    "IT / Dev": {
        "providers": ["anthropic", "openai", "local"],
        "reason": "แนะนำใช้ GPT / Claude สำหรับวิเคราะห์และเขียนโค้ด ร่วมกับ Local LLM สำหรับงานภายใน",
    },
    "Design": {
        "providers": ["image", "openai"],
        "reason": "เหมาะกับงานคอนเซ็ปต์อาร์ต ออกแบบ UI และเขียนพรอมป์ต",
    },
    "Marketing": {
        "providers": ["openai", "google"],
        "reason": "เหมาะกับการวางแผนแคมเปญและวิเคราะห์กลุ่มเป้าหมาย",
    },
    "Sales": {
        "providers": ["openai"],
        "reason": "เหมาะกับการติดตามลูกค้าและเขียนสคริปต์การขาย",
    },
    "HR": {
        "providers": ["anthropic", "openai"],
        "reason": "เหมาะกับการคัดกรองเรซูเม่และตั้งคำถามสัมภาษณ์",
    },
    "QA / Tester": {
        "providers": ["anthropic", "openai"],
        "reason": "เหมาะกับการทำเช็กลิสต์ วิเคราะห์บั๊ก และเขียนเทสต์เคส",
    },
    "Data / Research": {
        "providers": ["google", "anthropic", "openai"],
        "reason": "เหมาะกับงานวิจัยและสรุปข้อมูล",
    },
    "Game Studio": {
        "providers": ["openai", "anthropic", "image"],
        "reason": "เหมาะกับการออกแบบเกม เกมเพลย์ ระบบเศรษฐกิจ และแอสเซ็ต",
    },
}

DEFAULT_RECOMMENDATION = {
    "providers": ["openai", "anthropic"],
    "reason": "ผู้ช่วยอเนกประสงค์ที่เหมาะกับงานทั่วไป",
}


def recommend_for_department_type(department_type: str) -> dict:
    """Return {'providers': [...], 'reason': str} for a department type.

    Accepts both the display form ("IT / Dev") and a normalized slug
    ("IT_DEV"/"it-dev") so the ?department_type= query param is forgiving.
    """
    if department_type in RECOMMENDATION_RULES:
        return RECOMMENDATION_RULES[department_type]

    normalized = department_type.replace("_", " ").replace("-", " ").lower().strip()
    for key, value in RECOMMENDATION_RULES.items():
        if key.replace("/", "").replace("  ", " ").lower().strip() == normalized:
            return value
        if key.lower().replace(" / ", " ").strip() == normalized:
            return value
    return DEFAULT_RECOMMENDATION
