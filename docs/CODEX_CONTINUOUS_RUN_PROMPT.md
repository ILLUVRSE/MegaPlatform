# Codex Continuous Run Prompt (Background Terminal)

Use this prompt in Codex CLI when you want continuous phase execution.

## Prompt Template

```text
You are implementing ILLUVRSE phases continuously.

Primary references:
- docs/ILLUVRSE_PHASES.md (phases 1-20)
- docs/ILLUVRSE_PHASES_NEXT100.md (phases 21-120)

Execution mode:
1. Start at phase <START_PHASE>.
2. Implement exactly one phase at a time.
3. After each phase:
   - run relevant tests (minimum: pnpm shipcheck:quick)
   - update docs/runbooks impacted
   - commit with message: phase-<id>: <short-title>
   - print a concise completion report
4. If blocked:
   - create/update blocker note in docs/queue/blocked
   - commit blocker note
   - continue to next unblocked phase
5. Never use destructive git commands.
6. Never revert unrelated user changes.
7. Stop only when explicitly told to stop.

Output format per phase:
- Phase ID and title
- Files changed
- Checks run and results
- Risks/follow-ups
- Next phase selected
```

## Recommended start commands

```bash
codex
```

Then paste the template above with:
- `<START_PHASE>` = `21` (or your desired phase)

## Safety recommendation

Run in a dedicated branch, for example:

```bash
git checkout -b run/phases-21-120
```

