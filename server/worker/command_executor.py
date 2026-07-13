"""Command execution (mock, safety-checked).

Runs the safety policy for real, then returns a believable mock result instead
of touching a shell. Flip `DRY_RUN` off and implement `_execute_real` when you
are ready to run inside a sandboxed VPS workspace.
"""
from __future__ import annotations

from worker import safety

DRY_RUN = True  # MVP: never execute real shell commands.


class CommandExecutor:
    def run(self, workspace_path: str, command: str) -> dict:
        verdict = safety.check(command)
        if not verdict.allowed:
            return {
                "status": "blocked",
                "command": command,
                "stdout": "",
                "stderr": verdict.reason,
                "exit_code": 126,
            }

        if DRY_RUN:
            return self._mock_result(command)
        return self._execute_real(workspace_path, command)  # pragma: no cover

    def _mock_result(self, command: str) -> dict:
        stdout = {
            "npm install": "added 312 packages in 4s (mock)",
            "npm run build": "✓ build complete → /output (mock)",
            "npm run test": "Tests: 12 passed, 0 failed (mock)",
            "git status": "On branch main\nnothing to commit (mock)",
        }.get(command.strip(), f"executed: {command} (mock)")
        return {
            "status": "success",
            "command": command,
            "stdout": stdout,
            "stderr": "",
            "exit_code": 0,
        }

    def _execute_real(self, workspace_path: str, command: str) -> dict:  # pragma: no cover
        # FUTURE: run inside an isolated sandbox (docker exec / firejail / nsjail)
        # scoped to `workspace_path`, with timeouts and resource limits. Never
        # use shell=True with untrusted input.
        raise NotImplementedError("Real execution is disabled for MVP.")
