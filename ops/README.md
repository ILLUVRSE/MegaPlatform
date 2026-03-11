# Ops Agent MVP

This folder hosts the local-only agent MVP.

## How It Works (MVP)
1. Ryan writes tasks in `ops/briefing.md`.
2. Run the orchestrator to parse and enqueue tasks:
   - `python3 ops/orchestrator.py`
3. Use the runner to claim tasks for a role:
   - `python3 ops/runner.py --role "Content Ops"`
   - `python3 ops/runner.py --role "Content Ops" --claim`
4. The runner creates a local branch and scaffolds a log file.
5. Mark work complete:
   - `python3 ops/runner.py --role "Content Ops" --done --id <task-id>`

## Ground Rules
- Local branches only. No merges or deploys.
- Every task must map to a branch name.
- Destructive actions require explicit approval in the briefing.
- Summaries are required in `ops/logs/`.

## Files
- `ops/briefing.md`: daily instructions
- `ops/policies.md`: global safety rules
- `ops/agents/*.md`: role prompts and scopes
- `ops/orchestrator.py`: parses briefing and enqueues tasks
- `ops/runner.py`: claims tasks for a role
- `ops/queue/`: task state (pending/in_progress/done/blocked)
- `ops/logs/`: agent summaries
 - `ops/scripts/install-hooks.sh`: blocks git push by default

## Windows + WSL2
Use WSL2 to run the scripts. Example task scheduler command:
`wsl.exe -d <distro> -- python3 /home/ryan/ILLUVRSE/ops/orchestrator.py`

If systemd is enabled in your WSL2 distro, see `ops/systemd/README.md`.
Optional PowerShell helper: `ops/scripts/run-orchestrator.ps1`

## Git Safety
Install the local-only push block:
`ops/scripts/install-hooks.sh`
Merges and pushes are blocked unless `ALLOW_MERGE=1` or `ALLOW_PUSH=1` is set.
