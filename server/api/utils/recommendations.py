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
        "reason": "Good for coding, architecture, and debugging.",
    },
    "Design": {
        "providers": ["image", "openai"],
        "reason": "Good for concept art, UI ideas, and prompt writing.",
    },
    "Marketing": {
        "providers": ["openai", "google"],
        "reason": "Good for campaign planning and audience analysis.",
    },
    "Sales": {
        "providers": ["openai"],
        "reason": "Good for customer follow-up and sales scripts.",
    },
    "HR": {
        "providers": ["anthropic", "openai"],
        "reason": "Good for resume review and interview question generation.",
    },
    "QA / Tester": {
        "providers": ["anthropic", "openai"],
        "reason": "Good for checklists, bug analysis, and test cases.",
    },
    "Data / Research": {
        "providers": ["google", "anthropic", "openai"],
        "reason": "Good for research and summarization.",
    },
    "Game Studio": {
        "providers": ["openai", "anthropic", "image"],
        "reason": "Good for game design, gameplay, economy, and assets.",
    },
}

DEFAULT_RECOMMENDATION = {
    "providers": ["openai", "anthropic"],
    "reason": "General-purpose assistants that fit most tasks.",
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
