"""Command safety: allowlist + blocklist.

Every command that would ever hit a real shell must pass `check()` first. For
MVP nothing executes, but the policy is enforced now so the contract is stable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Only the *first token* (the program) is matched against the allowlist, plus a
# few multi-word subcommands. Keep this conservative.
ALLOWED_COMMANDS = {
    "npm", "npx", "yarn", "pnpm",
    "node", "python", "python3", "pip", "pip3",
    "git", "ls", "cat", "mkdir", "touch", "echo", "pwd", "cd",
}

# Explicit allowed full-command patterns (documented in the requirements).
ALLOWED_PATTERNS = [
    r"^npm (install|run build|run test|ci)\b",
    r"^python[3]? [\w./-]+\.py\b",
    r"^git (status|add|commit|push|pull|log|diff)\b",
    r"^(ls|pwd|cat|mkdir|touch)\b",
]

# Hard blocks — if any of these appear anywhere, reject immediately.
BLOCKED_PATTERNS = [
    r"rm\s+-rf\s+/", r"\bshutdown\b", r"\breboot\b", r"\bsudo\b",
    r"\buseradd\b", r"\bchmod\s+777\s+/", r"\bmkfs\b", r"\bdd\s+if=",
    r":\(\)\s*\{", r"curl[^|]*\|\s*(bash|sh)", r"wget[^|]*\|\s*(bash|sh)",
    r">\s*/dev/sd", r"\bkill\s+-9\s+1\b",
]


@dataclass
class SafetyResult:
    allowed: bool
    reason: str


def check(command: str) -> SafetyResult:
    cmd = command.strip()
    if not cmd:
        return SafetyResult(False, "Empty command.")

    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, cmd):
            return SafetyResult(False, f"Blocked by safety policy: matched /{pattern}/")

    program = cmd.split()[0]
    if program in ALLOWED_COMMANDS:
        return SafetyResult(True, "Program is in the allowlist.")

    for pattern in ALLOWED_PATTERNS:
        if re.match(pattern, cmd):
            return SafetyResult(True, "Matched an allowed command pattern.")

    return SafetyResult(False, f"Command '{program}' is not in the allowlist.")
