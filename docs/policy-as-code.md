# Policy as Code

The policy runtime is a reusable evaluator in `packages/governance/policyEngine.ts`.

It supports:
- JSON or YAML policy documents
- API and infrastructure targets
- ordered allow and deny rules with typed resource and operation matching
- append-only admin audit entries for every evaluated enforcement decision

Primary admin surfaces:
- `POST /api/admin/policies/enforce`
- `POST /api/admin/feed/[id]/hide`
- `POST /api/admin/feed/[id]/shadowban`
- `PUT /api/admin/users/[id]` when disabling a user
- `DELETE /api/admin/episodes/[id]`
- `POST /api/admin/assets/cleanup` for destructive cleanup runs

Audit behavior:
- Every policy check writes an immutable `AdminAudit` record with action `policy:evaluation`.
- Successful mutations still emit their normal admin audit action, so forensics can reconstruct both the policy decision and the resulting state change.

Current coverage:
- User bans reject protected admin targets.
- Content takedowns reject pinned or featured feed posts.
- Destructive database operations reject deleting live-scheduled episodes and aggressive bulk asset cleanup runs.

Known limit:
- Coverage is explicit per endpoint. New destructive routes do not inherit protection unless they opt into the enforcement helper.
