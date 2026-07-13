"""CLI task runner for the local creative image worker.

Usage:
  python tools/creative_worker/run_task.py --task creative_tasks/pending/it-dev-floor-base.json

Never prints the API key. Produces a JSON report in outputs/reports/ and moves
the task JSON to creative_tasks/completed|failed/.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from utils import (  # type: ignore
    MISSING_KEY_MESSAGE, api_key_present, find_repo_root, load_environment, log, now_iso,
)


def _resolve(repo_root: Path, path_str: str, cwd: Path) -> Path:
    p = Path(path_str)
    if p.is_absolute():
        return p
    # Prefer CWD for the --task arg convenience; fall back to repo root.
    cwd_candidate = (cwd / p).resolve()
    if cwd_candidate.exists():
        return cwd_candidate
    return (repo_root / p).resolve()


def _write_report(repo_root: Path, task_id: str, report: dict) -> Path:
    out = repo_root / "outputs" / "reports" / f"{task_id}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return out


def _move_task(task_path: Path, repo_root: Path, status: str, task_data: dict) -> Path:
    dest_dir = repo_root / "creative_tasks" / ("completed" if status == "completed" else "failed")
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / task_path.name
    dest.write_text(json.dumps(task_data, indent=2), encoding="utf-8")
    if task_path.resolve() != dest.resolve() and task_path.exists():
        task_path.unlink()
    return dest


def main() -> int:
    parser = argparse.ArgumentParser(description="Creative image worker task runner")
    parser.add_argument("--task", required=True, help="Path to a creative task JSON")
    args = parser.parse_args()

    repo_root = find_repo_root()
    cwd = Path.cwd()

    # 1–2. Environment (priority: .env.local > .env > OS)
    load_environment(repo_root)
    key_detected = api_key_present()
    log(f"OPENAI_API_KEY detected: {'yes' if key_detected else 'no'}")

    started = now_iso()
    report: dict = {
        "task_id": None, "status": "failed", "model": None,
        "api_key_detected": key_detected,
        "reference_found": False, "reference_path": None,
        "reference_width": None, "reference_height": None, "reference_format": None,
        "prompt_source": None, "source_file": None,
        "final_file": None, "final_width": None, "final_height": None, "final_format": None,
        "transparency_status": None, "visual_lab_url": None,
        "visual_lab_screenshot": None, "screenshot_status": None,
        "errors": [], "started_at": started, "completed_at": None,
    }

    # Deferred heavy imports so a missing dep gives a clear message.
    try:
        from task_schema import CreativeTask  # type: ignore
    except ImportError:
        log("Dependencies missing. Run: pip install -r tools/creative_worker/requirements.txt")
        return 2

    task_path = _resolve(repo_root, args.task, cwd)
    if not task_path.is_file():
        report["errors"].append(f"Task file not found: {args.task}")
        report["completed_at"] = now_iso()
        _write_report(repo_root, "unknown-task", report)
        log(f"Task file not found: {args.task}")
        return 1

    raw = json.loads(task_path.read_text(encoding="utf-8"))
    task = CreativeTask(**raw)
    report["task_id"] = task.task_id
    report["model"] = task.model
    report["prompt_source"] = task.prompt_source
    report["transparency_status"] = task.transparency_status
    report["visual_lab_url"] = task.visual_lab_url

    def fail(message: str, task_data: dict) -> int:
        task_data["status"] = "failed"
        task_data["updated_at"] = now_iso()
        task_data["error_message"] = message
        report["status"] = "failed"
        report["errors"].append(message)
        report["completed_at"] = now_iso()
        _write_report(repo_root, task.task_id, report)
        _move_task(task_path, repo_root, "failed", task_data)
        log(f"TASK FAILED: {message}")
        return 1

    # 3. Key presence gate
    if not key_detected:
        return fail(MISSING_KEY_MESSAGE, raw)

    # 5. status → running
    raw["status"] = "running"
    raw["updated_at"] = now_iso()
    task_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")

    try:
        from PIL import Image  # type: ignore
        from prompt_loader import load_prompt  # type: ignore
        from openai_image_worker import generate_image, size_for_aspect  # type: ignore
        from postprocess import contain_fit, cover_crop_resize  # type: ignore

        # 6. Load prompt from markdown
        prompt = load_prompt(repo_root, task.prompt_source, task.prompt_section, task.prompt_suffix)

        # 7. Verify ALL reference images (any missing → stop before spending a call)
        if not task.reference_images:
            return fail("No reference_images specified in task.", raw)
        ref_paths = []
        for ref_rel in task.reference_images:
            rp = _resolve(repo_root, ref_rel, cwd)
            if not rp.is_file():
                return fail(f"Reference image missing:\n{ref_rel}", raw)
            ref_paths.append(rp)
        with Image.open(ref_paths[0]) as ref_img:  # record the primary reference
            report["reference_found"] = True
            report["reference_path"] = str(ref_paths[0])
            report["reference_width"], report["reference_height"] = ref_img.size
            report["reference_format"] = (ref_img.format or "").upper()
        if len(ref_paths) > 1:
            report["errors"].append(f"references_used: {len(ref_paths)}")

        # 8–9. Generate + save untouched source (aspect-appropriate size)
        source_path = _resolve(repo_root, task.source_output_path, cwd)
        gen_size = size_for_aspect(task.expected_width, task.expected_height)
        result = generate_image(
            prompt, ref_paths, task.model, task.quality, source_path,
            size=gen_size, transparent=task.transparency_requested,
        )
        report["model"] = result.model_used
        report["source_file"] = result.source_path
        report["errors"].extend(result.notes)  # e.g. documented model substitution

        # 10–11. Post-process to exact final WebP + verify (mode from crop_mode)
        output_path = _resolve(repo_root, task.output_path, cwd)
        if task.crop_mode == "contain":
            pp = contain_fit(source_path, output_path, task.expected_width, task.expected_height)
        else:
            pp = cover_crop_resize(
                source_path, output_path, task.expected_width, task.expected_height,
                task.focal_x, task.focal_y,
            )
        report["final_file"] = pp.final_path
        report["final_width"], report["final_height"], report["final_format"] = pp.width, pp.height, pp.fmt
        if task.transparency_requested:
            report["transparency_status"] = "transparent" if pp.has_alpha else "opaque_no_alpha"

        # 12. Optional screenshot (named per asset)
        if task.screenshot_after_generation and task.visual_lab_url:
            from screenshot_visual_lab import capture  # type: ignore
            shot_name = f"{Path(task.asset_name).stem}-latest.png"
            shot_path = repo_root / "outputs" / "screenshots" / shot_name
            shot = capture(task.visual_lab_url, shot_path)
            report["screenshot_status"] = shot.status
            report["visual_lab_screenshot"] = shot.path
            if shot.reason:
                report["errors"].append(f"screenshot: {shot.reason}")
        else:
            report["screenshot_status"] = "skipped"

        # 13–14. Report + move to completed
        raw["status"] = "completed"
        raw["updated_at"] = now_iso()
        raw["error_message"] = None
        report["status"] = "completed"
        report["completed_at"] = now_iso()
        _write_report(repo_root, task.task_id, report)
        _move_task(task_path, repo_root, "completed", raw)

        log("ASSET READY")
        log(f"  final: {pp.final_path} ({pp.width}x{pp.height} {pp.fmt})")
        log("ENGINE: COMPLETE | ASSET GENERATION: COMPLETE | VISUAL REVIEW: PENDING")
        return 0

    except Exception as e:  # any failure → diagnostics preserved, source kept
        return fail(str(e), raw)


if __name__ == "__main__":
    sys.exit(main())
