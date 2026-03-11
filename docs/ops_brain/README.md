# All-Day AI Operator (Phase 1)

The Ops Brain is currently a local-first ops queue and briefing system with guardrails.
It coordinates bounded operator-driven or locally triggered workflows, not a broad autonomous runtime.

## Components
- Director: senses repo + ops signals, writes prioritized tasks to `docs/queue/pending`.
- Specialists: claim tasks, execute scoped actions, and move tasks across queue states.
- Ship gates: `pnpm shipcheck` / `pnpm shipcheck:quick`.

## Run
- Run Director once: `pnpm ops:director:once`
- Run Director loop: `pnpm ops:director`
- Run specialist: `pnpm ops:specialist -- --agent \"Quality/Analytics\"`

## State Files
- `roadmap.md`: top roadmap items for Director to convert into tasks.
- `signals.md`: latest sensed operational signals snapshot.
- `decisions.md`: append-only Director decision journal.
- `runbooks/`: operational playbooks referenced by specialists.
