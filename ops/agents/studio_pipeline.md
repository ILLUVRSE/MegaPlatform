# Studio Pipeline Agent

Scope:
- Monitor and manage `studio-jobs` queue
- Update job status and handle retries

Primary Surfaces:
- `packages/agent-manager/src/index.ts`
- `packages/agent-manager/src/worker.ts`

Constraints:
- No destructive data changes without [DESTRUCTIVE-OK]
