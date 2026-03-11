#!/usr/bin/env python3
"""Local-only orchestrator MVP.

- Parses ops/briefing.md
- Enqueues tasks into ops/queue/pending/*.json
- Avoids duplicates via ops/queue/index.json
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent
BRIEFING = ROOT / "briefing.md"
QUEUE_DIR = ROOT / "queue"
PENDING_DIR = QUEUE_DIR / "pending"
BLOCKED_DIR = QUEUE_DIR / "blocked"
INDEX_FILE = QUEUE_DIR / "index.json"

SECTION_PREFIX = "["
SECTION_SUFFIX = "]"

@dataclass
class Task:
    role: str
    text: str


def load_briefing() -> str:
    if not BRIEFING.exists():
        raise FileNotFoundError(f"Missing briefing: {BRIEFING}")
    return BRIEFING.read_text(encoding="utf-8")


def parse_tasks(content: str) -> List[Task]:
    tasks: List[Task] = []
    current_role: str | None = None
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(SECTION_PREFIX) and line.endswith(SECTION_SUFFIX):
            current_role = line[1:-1].strip()
            continue
        if line.startswith("-") and current_role:
            text = line.lstrip("-").strip()
            if text:
                tasks.append(Task(role=current_role, text=text))
    return tasks


def destructive_allowed(content: str) -> bool:
    return "[DESTRUCTIVE-OK]" in content


def load_index() -> Dict[str, Dict[str, str]]:
    if not INDEX_FILE.exists():
        return {}
    return json.loads(INDEX_FILE.read_text(encoding="utf-8"))


def save_index(index: Dict[str, Dict[str, str]]) -> None:
    INDEX_FILE.write_text(json.dumps(index, indent=2, sort_keys=True), encoding="utf-8")


def task_fingerprint(task: Task) -> str:
    h = hashlib.sha256()
    h.update(task.role.encode("utf-8"))
    h.update(b"::")
    h.update(task.text.encode("utf-8"))
    return h.hexdigest()


def enqueue_task(task: Task, index: Dict[str, Dict[str, str]], allow_destructive: bool) -> bool:
    fingerprint = task_fingerprint(task)
    if fingerprint in index:
        return False

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    task_id = f"{now.replace(':', '').replace('-', '')}-{fingerprint[:8]}"
    needs_destructive_ok = "[DESTRUCTIVE]" in task.text and not allow_destructive
    status = "blocked" if needs_destructive_ok else "pending"
    payload = {
        "id": task_id,
        "role": task.role,
        "text": task.text,
        "created_at": now,
        "status": status,
    }

    out_dir = BLOCKED_DIR if needs_destructive_ok else PENDING_DIR
    out_file = out_dir / f"{task_id}.json"
    out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    index[fingerprint] = {
        "id": task_id,
        "role": task.role,
        "text": task.text,
        "created_at": now,
    }
    return True


def main() -> int:
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    PENDING_DIR.mkdir(parents=True, exist_ok=True)
    BLOCKED_DIR.mkdir(parents=True, exist_ok=True)

    content = load_briefing()
    tasks = parse_tasks(content)
    if not tasks:
        print("No tasks found in briefing.")
        return 0

    index = load_index()
    new_count = 0
    allow_destructive = destructive_allowed(content)
    for task in tasks:
        if enqueue_task(task, index, allow_destructive):
            new_count += 1

    save_index(index)
    print(f"Enqueued {new_count} new task(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
