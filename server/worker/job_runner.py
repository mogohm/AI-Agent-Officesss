"""Standalone worker loop (mock).

In production this process would pull jobs from a queue (Redis/RQ/Celery) and
drive project execution on the VPS. For MVP it is a thin, runnable stub that
demonstrates the shape and can be started with `python -m worker.job_runner`.
"""
from __future__ import annotations

import time

from worker.command_executor import CommandExecutor
from worker.workspace_manager import WorkspaceManager


class JobRunner:
    def __init__(self) -> None:
        self.workspaces = WorkspaceManager()
        self.executor = CommandExecutor()

    def run_once(self, job: dict) -> dict:
        """Process a single mock job dict: {type, workspace_path, command?}."""
        if job.get("type") == "create_workspace":
            return self.workspaces.create_workspace(
                job["company_id"], job["project_id"], job["project_name"]
            )
        if job.get("type") == "run_command":
            return self.executor.run(job.get("workspace_path", ""), job["command"])
        return {"status": "ignored", "reason": f"unknown job type {job.get('type')}"}

    def loop(self, poll_seconds: float = 2.0) -> None:  # pragma: no cover
        # FUTURE: replace with real queue consumption (Redis pub/sub or RQ).
        print("🛠️  AI Agent Office worker started (mock). Waiting for jobs…")
        while True:
            time.sleep(poll_seconds)


if __name__ == "__main__":  # pragma: no cover
    JobRunner().loop()
