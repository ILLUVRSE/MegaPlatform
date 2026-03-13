# Studio Publish QA Auditing

Studio project publish writes a `ContentQaResult` record for every publish attempt, including blocked publishes.

Each QA record now stores:
- publish outcome status (`PASS` or `FAIL`)
- checks run (`asset-presence`, `asset-kind`, `caption-policy`)
- `reporterId` for the user who triggered the publish
- audit timestamp in both `createdAt` and `issuesJson.outcome.timestamp`

The audit payload is persisted in `ContentQaResult.issuesJson` as:
- `issues`: QA findings
- `outcome`: `{ status, passed, checksRun, reporterId, timestamp }`

Admin QA history is available at `GET /api/admin/studio/qa-results?projectId=<id>`.

The response is ordered newest-first and returns audit-friendly QA history for the project, including scores, issues, checks run, reporter identity, and the persisted outcome payload.
