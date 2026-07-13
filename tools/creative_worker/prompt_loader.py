"""Load the real art prompt from a markdown doc — never hardcode it in Python.

Given a markdown file, an exact section heading, and a suffix, this finds the
first fenced ``` block directly under that heading and returns block + suffix.
"""
from __future__ import annotations

from pathlib import Path


class PromptLoadError(RuntimeError):
    pass


def load_prompt(repo_root: Path, prompt_source: str, prompt_section: str, prompt_suffix: str = "") -> str:
    md_path = (repo_root / prompt_source).resolve()
    if not md_path.is_file():
        raise PromptLoadError(f"Prompt source file not found: {prompt_source}")

    lines = md_path.read_text(encoding="utf-8").splitlines()

    # Find the exact heading line (trimmed match).
    target = prompt_section.strip()
    start = None
    for i, line in enumerate(lines):
        if line.strip() == target:
            start = i
            break
    if start is None:
        raise PromptLoadError(f"Section not found in {prompt_source}: {prompt_section!r}")

    # Find the first fenced code block after the heading.
    fence_open = None
    for i in range(start + 1, len(lines)):
        if lines[i].lstrip().startswith("```"):
            fence_open = i
            break
    if fence_open is None:
        raise PromptLoadError(f"No fenced ``` prompt block under section {prompt_section!r}")

    block: list[str] = []
    fence_closed = False
    for i in range(fence_open + 1, len(lines)):
        if lines[i].lstrip().startswith("```"):
            fence_closed = True
            break
        block.append(lines[i])
    if not fence_closed:
        raise PromptLoadError(f"Unterminated ``` prompt block under section {prompt_section!r}")

    prompt = "\n".join(block).strip()
    if not prompt:
        raise PromptLoadError(f"Empty prompt block under section {prompt_section!r}")

    if prompt_suffix.strip():
        prompt = f"{prompt}\n\n{prompt_suffix.strip()}"
    return prompt
