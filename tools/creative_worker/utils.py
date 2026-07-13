"""Shared helpers: repo-root discovery, secret-safe env loading, logging.

SECURITY: this module never prints, returns, or logs the value of any secret.
`api_key_present()` returns a boolean only.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path


def find_repo_root(start: Path | None = None) -> Path:
    """The project root = the directory that contains both apps/web and docs."""
    here = (start or Path(__file__)).resolve()
    for p in [here, *here.parents]:
        if (p / "apps" / "web").is_dir() and (p / "docs").is_dir():
            return p
    # Fallback: tools/creative_worker/<file> → root is two parents up.
    return Path(__file__).resolve().parents[2]


def _parse_env_file(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.is_file():
        return data
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        data[key.strip()] = val.strip().strip('"').strip("'")
    return data


def load_environment(root: Path) -> None:
    """Load env with priority: .env.local > .env > existing OS environment.

    OS env stays as the base; .env overrides it; .env.local overrides both.
    Values are pushed into os.environ but never printed.
    """
    for name in (".env", ".env.local"):  # .env first, then .env.local wins
        for key, val in _parse_env_file(root / name).items():
            os.environ[key] = val


def api_key_present() -> bool:
    """True if a usable OPENAI_API_KEY is set (value never exposed)."""
    val = os.environ.get("OPENAI_API_KEY", "").strip()
    return bool(val) and not val.startswith("<")


MISSING_KEY_MESSAGE = (
    "OPENAI_API_KEY is missing.\n"
    "Add it to the repository root .env.local file."
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(msg: str) -> None:
    print(msg, flush=True)
