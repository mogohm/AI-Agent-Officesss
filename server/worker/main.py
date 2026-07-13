"""Worker entrypoint. Run with: python -m worker.main"""
from __future__ import annotations

from worker.job_runner import JobRunner

if __name__ == "__main__":  # pragma: no cover
    JobRunner().loop()
