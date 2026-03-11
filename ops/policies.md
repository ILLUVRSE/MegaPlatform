# Global Policies

## Safety
- Local branches only. Never merge or push to main.
- Destructive actions require explicit tag: [DESTRUCTIVE-OK] in `ops/briefing.md`.
- If unclear, stop and log the question in `ops/logs/`.
 - Git hooks block merge and push by default.

## Branch Naming
Use: `agent/<role>/<YYYY-MM-DD>/<slug>`

Examples:
- `agent/content-ops/2026-02-12/add-new-shows`
- `agent/frontend/2026-02-12/watch-landing-layout`

## Logging
Each task must produce a log file:
- `ops/logs/<branch-with-slashes-replaced-by-__>.md`

Log template:
- Summary
- Files changed
- Tests run (or not run + reason)
- Risks/notes

## Tests
- Run scope-appropriate tests.
- If tests are skipped, explain why.
