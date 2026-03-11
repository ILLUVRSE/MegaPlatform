#!/usr/bin/env python3
"""Minimal task runner for a specific role.

- Lists pending tasks for the role
- Claims a task by moving it to in_progress
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PENDING_DIR = ROOT / "queue" / "pending"
IN_PROGRESS_DIR = ROOT / "queue" / "in_progress"
DONE_DIR = ROOT / "queue" / "done"
LOGS_DIR = ROOT / "logs"
LOG_TEMPLATE = ROOT / "templates" / "log.md"


def load_tasks_for_role(role: str):
    tasks = []
    for path in sorted(PENDING_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("role") == role:
            tasks.append((path, payload))
    return tasks


def claim_task(path: Path):
    IN_PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
    dest = IN_PROGRESS_DIR / path.name
    shutil.move(str(path), str(dest))
    return dest


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return slug or "task"


def role_slug(role: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", role).strip("-").lower()


def ensure_git_branch(role: str, text: str) -> str | None:
    date = datetime.now().strftime("%Y-%m-%d")
    branch = f"agent/{role_slug(role)}/{date}/{slugify(text)[:48]}"
    try:
        subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], check=True, capture_output=True)
        exists = subprocess.run(["git", "rev-parse", "--verify", branch], capture_output=True)
        if exists.returncode == 0:
            subprocess.run(["git", "checkout", branch], check=True)
        else:
            subprocess.run(["git", "checkout", "-b", branch], check=True)
    except subprocess.CalledProcessError:
        return None
    return branch


def write_log(branch: str | None, task_id: str, text: str) -> str | None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    if branch:
        filename = branch.replace("/", "__") + ".md"
    else:
        filename = f"{task_id}.md"
    path = LOGS_DIR / filename
    if path.exists():
        return str(path)
    if LOG_TEMPLATE.exists():
        template = LOG_TEMPLATE.read_text(encoding="utf-8")
        path.write_text(template, encoding="utf-8")
    else:
        path.write_text(f"# Summary\n\n{task_id}: {text}\n", encoding="utf-8")
    return str(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", required=True, help="Role name, e.g. 'Content Ops'")
    parser.add_argument("--claim", action="store_true", help="Claim the first task")
    parser.add_argument("--id", help="Claim a specific task id")
    parser.add_argument("--done", action="store_true", help="Mark a claimed task as done")
    args = parser.parse_args()

    tasks = load_tasks_for_role(args.role)
    if not tasks:
        print(f"No pending tasks for role: {args.role}")
        return 0

    print(f"Pending tasks for {args.role}:")
    for _, payload in tasks:
        print(f"- {payload['id']}: {payload['text']}")

    if args.claim:
        selected = None
        if args.id:
            for path, payload in tasks:
                if payload["id"] == args.id:
                    selected = (path, payload)
                    break
        if not selected:
            selected = tasks[0]
        path, payload = selected
        dest = claim_task(path)
        branch = ensure_git_branch(payload["role"], payload["text"])
        log_path = write_log(branch, payload["id"], payload["text"])
        payload["status"] = "in_progress"
        if branch:
            payload["branch"] = branch
        dest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"Claimed task {payload['id']} -> {dest}")
        if branch:
            print(f"Created branch: {branch}")
        if log_path:
            print(f"Log: {log_path}")

    if args.done:
        DONE_DIR.mkdir(parents=True, exist_ok=True)
        if not args.id:
            print("--done requires --id")
            return 1
        in_progress = IN_PROGRESS_DIR / f"{args.id}.json"
        if not in_progress.exists():
            print(f"Task not found in progress: {args.id}")
            return 1
        payload = json.loads(in_progress.read_text(encoding="utf-8"))
        payload["status"] = "done"
        DONE_DIR.mkdir(parents=True, exist_ok=True)
        done_path = DONE_DIR / in_progress.name
        done_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        in_progress.unlink()
        print(f"Marked task done: {args.id}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
