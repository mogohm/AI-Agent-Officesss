"""Emit prompt sections + task JSONs for the Bright Office long-run.

Writes docs/BRIGHT_STATE_PROMPTS.md (one section per asset) and
creative_tasks/pending/<task>.json for every asset in the plan below.
Identity-lock rule: every action state's PRIMARY image reference is that
character's approved bright IDLE master; never another character or state.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs" / "BRIGHT_STATE_PROMPTS.md"
PENDING = ROOT / "creative_tasks" / "pending"
CH = "apps/web/public/assets/themes/reference-bright/characters"
FL = "apps/web/public/assets/themes/reference-bright/floors"
CROP = "references/style-lock/reference-floor-isometric-sample.png"
FULL = "references/ai-agent-office-reference.png"

SPRITE_RULES = (
    "One single cute isometric pixel-art office worker character on a fully "
    "TRANSPARENT background - a standalone game sprite, NO room, NO floor, NO "
    "shadow, NO desk, NO monitor, NO furniture of any kind baked into the "
    "image, NO background. Fine pixel density, thin soft outlines, soft "
    "daylight shading with gentle highlights, cute 1:2.5 head-to-body "
    "proportions, 3/4 top-down camera. Full body visible head to feet. "
    "NO text, NO watermark. NOT anime, NOT chunky retro pixels, NO neon."
)

IDENT = {
    "frontend-developer": (
        "EXACTLY THE SAME PERSON as reference image #1 (his approved idle "
        "master): young male-presenting frontend developer, short tousled "
        "near-black hair with side-swept fringe, light-medium skin, no facial "
        "hair, slim build, light heather-gray tee under an open soft BLUE "
        "overshirt, dark slim jeans, sneakers with blue accent, small "
        "over-ear HEADPHONES around his neck. Same face, same hair, same "
        "outfit, same colors, same proportions as image #1."
    ),
    "backend-developer": (
        "EXACTLY THE SAME PERSON as reference image #1 (his approved idle "
        "master): male-presenting backend developer, dark-brown short "
        "undercut, short neat beard, warmer deeper skin tone, slightly "
        "taller broader build, medium slate-TEAL technical zip jacket open "
        "over a light gray tee, bright teal LANYARD with white ID card, dark "
        "gray trousers. Same face, same beard, same jacket, same colors, "
        "same proportions as image #1."
    ),
    "system-analyst": (
        "EXACTLY THE SAME PERSON as reference image #1 (her approved idle "
        "master): female-presenting system analyst, dark-brown hair in a "
        "neat LOW BUN, round thin-framed GLASSES, medium skin tone, shorter "
        "slimmer build, light cream blouse under a soft LAVENDER-mauve "
        "cardigan, tailored dark trousers, flats. Same face, same glasses, "
        "same bun, same cardigan, same colors, same proportions as image #1."
    ),
    "product-manager": (
        "A NEW member of the same character family as the workers in "
        "reference image #4: female-presenting product manager, warm brown "
        "shoulder-length hair half-up, light-medium skin, approachable "
        "professional face, smart-casual outfit - white blouse under a NAVY "
        "blazer-cardigan with a small LAVENDER scarf accent, tailored "
        "trousers, neat shoes. She carries a slim planning notebook. Clear "
        "friendly management presence, medium height."
    ),
    "growth-strategist": (
        "A NEW member of the same character family as the workers in "
        "reference image #4: male-presenting growth strategist, energetic, "
        "short curly dark-auburn hair, medium skin, bright confident face, "
        "modern casual office outfit - white tee under an open CORAL-ORANGE "
        "overshirt, dark chinos, clean sneakers with orange accent. He "
        "carries a small tablet showing a tiny symbolic rising chart."
    ),
    "visual-designer": (
        "A NEW member of the same character family as the workers in "
        "reference image #4: female-presenting visual designer, creative, "
        "soft wavy chestnut hair loose to the shoulders with a tiny PINK "
        "hair clip, light skin, gentle artistic face, outfit - cream top "
        "under a dusty PINK apron-style overall or smock with a LAVENDER "
        "sleeve accent, comfortable trousers, flats. She holds a small "
        "sketchbook and pencil. Clearly different silhouette from everyone."
    ),
    "qa-engineer": (
        "A NEW member of the same character family as the workers in "
        "reference image #4: male-presenting QA engineer, methodical and "
        "tidy, straight black hair with a neat side part, rectangular thin "
        "glasses, medium-deep skin, calm precise face, outfit - light AQUA/ "
        "teal polo shirt, dark trousers, plain shoes, a small test phone "
        "device in one hand and a checklist card in the other."
    ),
    "game-designer": (
        "A NEW member of the same character family as the workers in "
        "reference image #4: female-presenting game designer, playful "
        "creative energy, dark hair in a high ponytail with a YELLOW hair "
        "tie, tan skin, bright cheerful face, outfit - mustard-YELLOW hoodie "
        "open over a white tee with a small blue star print, dark jeans, "
        "colorful sneakers. She holds a game controller."
    ),
}

POSES = {
    "coding": "active coding: leaning slightly forward with focus, holding a slim laptop on one forearm and typing on it with the other hand, eyes on the screen",
    "reviewing": "reviewing: reading a small tablet held in one hand, other hand thoughtfully at the chin, attentive expression",
    "coffee": "coffee break: relaxed, holding a warm coffee mug near the chest with both hands, content easy expression, weight on one hip",
    "monitoring": "focused monitoring: alert but calm, holding a tablet showing tiny symbolic green status tiles, scanning it carefully",
    "debugging": "debugging: concentrated slight frown, holding a small diagnostic laptop on one forearm, other hand tapping a key decisively",
    "reading": "reading: relaxed, holding a small open book in both hands, calm absorbed expression",
    "analysing": "analysing: focused, annotating the tablet with a stylus, slight forward lean of attention",
    "relaxing": "relaxing: soft smile, holding a warm tea cup, shoulders fully relaxed, weight settled comfortably",
    "idle": "relaxed standing idle: ready to work, natural asymmetry, shoulders relaxed, one foot slightly offset, friendly expression",
    "planning": "planning: holding the notebook open and marking a milestone with a pen, engaged organized expression",
    "designing": "designing: drawing on a small pen-display tablet held on one forearm, stylus in the other hand, absorbed creative focus",
    "sketching": "sketching: relaxed, sketchbook open in one arm, pencil loosely drawing, dreamy creative expression",
    "testing": "testing: methodically checking the test phone in one hand while marking the checklist card with the other, precise attention",
    "playtesting": "playtesting: actively playing with the game controller in both hands, leaning slightly with engaged excitement",
}

# (dept_dir, char_id, [states in generation order]) — idle first when new.
PLAN = [
    ("engineering", "frontend-developer", ["coding", "reviewing", "coffee"]),
    ("engineering", "backend-developer", ["monitoring", "debugging", "reading"]),
    ("engineering", "system-analyst", ["reviewing", "analysing", "relaxing"]),
    ("product-management", "product-manager", ["idle", "planning", "coffee"]),
    ("growth", "growth-strategist", ["idle", "analysing", "coffee"]),
    ("art-design", "visual-designer", ["idle", "designing", "sketching"]),
    ("quality", "qa-engineer", ["idle", "testing", "reviewing"]),
    ("game-studio", "game-designer", ["idle", "designing", "playtesting"]),
]

FLOOR_OF = {
    "engineering": "engineering-floor.webp",
    "product-management": "product-management-floor.webp",
    "growth": "growth-floor.webp",
    "art-design": "art-design-floor.webp",
    "quality": "quality-floor.webp",
    "game-studio": "game-studio-floor.webp",
}


def section_name(char: str, state: str) -> str:
    return f"## {char} {state}"


def main() -> None:
    lines = [
        "# Bright State Prompts",
        "",
        "Generated by tools/creative_worker/make_bright_tasks.py — one section",
        "per asset. Identity rule: action states reference their own idle",
        "master as image #1 (identity); floor #2 (lighting); full reference #3",
        "(world). New idles reference the family (Engineering trio) as #4.",
        "",
    ]
    tasks = []
    for dept, char, states in PLAN:
        for state in states:
            is_new_idle = state == "idle"
            pose = POSES[state]
            ident = IDENT[char]
            body = f"{SPRITE_RULES}\n\n{ident}\n\nPOSE ({state}): {pose}. Clearly readable activity even when the sprite is only 60 pixels tall. Any prop (laptop, tablet, mug, book, controller, sketchbook) is SMALL and hand-held - never a desk, monitor or furniture."
            lines += [section_name(char, state), "", "```", body, "```", ""]

            refs = []
            if is_new_idle:
                refs = [CROP, FULL, f"{FL}/{FLOOR_OF[dept]}",
                        f"{CH}/engineering/frontend-developer-idle.webp",
                        f"{CH}/engineering/system-analyst-idle.webp"]
                suffix = ("True transparent alpha mandatory. This is a NEW person in the same sprite family as references #4 and #5 - "
                          "match their pixel density, outline softness, shading and proportions, but do NOT copy their faces or outfits.")
            else:
                refs = [f"{CH}/{dept}/{char}-idle.webp",
                        f"{FL}/{FLOOR_OF[dept]}", FULL]
                suffix = ("True transparent alpha mandatory. Image #1 is THE SAME PERSON - preserve face, hair, outfit, colors and "
                          "proportions exactly; only the pose and small hand-held prop change.")

            task = {
                "task_id": f"bright-{dept}-{char}-{state}",
                "task_type": "generate_image",
                "status": "pending",
                "asset_name": f"{char}-{state}.webp",
                "prompt_source": "docs/BRIGHT_STATE_PROMPTS.md",
                "prompt_section": section_name(char, state),
                "prompt_suffix": suffix,
                "reference_images": refs,
                "output_path": f"{CH}/{dept}/{char}-{state}.webp",
                "source_output_path": f"outputs/source/bright-{dept}-{char}-{state}-source.png",
                "expected_width": 256, "expected_height": 384, "aspect_ratio": "2:3",
                "model": "gpt-image-1", "quality": "high", "crop_mode": "contain",
                "focal_x": 0.5, "focal_y": 0.5, "transparency_requested": True,
                "visual_lab_url": "http://localhost:3000/bright-office",
                "screenshot_after_generation": False,
                "metadata": {"phase": "bright-office-long-run", "theme": "reference-bright",
                             "department": dept, "character": char, "state": state,
                             "asset_role": "character_master" if is_new_idle else "character_state"},
            }
            tasks.append(task)

    DOC.write_text("\n".join(lines), encoding="utf-8")
    PENDING.mkdir(parents=True, exist_ok=True)
    for t in tasks:
        (PENDING / f"{t['task_id']}.json").write_text(json.dumps(t, indent=2), encoding="utf-8")
    print(f"wrote {DOC.name} + {len(tasks)} tasks")


if __name__ == "__main__":
    main()
