# Content QA Agent Integration

Phase 64 adds auditable pre-publish QA gating for studio outputs.

## Data model

- `ContentQaResult`
  - `status` (`PASS` / `FAIL`)
  - `technicalScore`
  - `policyScore`
  - `issuesJson`
  - `checkedBy` (default `qa-agent-v1`)

## Runtime gating

- Studio publish now evaluates content QA before creating `ShortPost`.
- QA results are always persisted for auditability.
- Publish is blocked (`409`) when QA status is `FAIL`.

## Evaluations in v1

- Technical: required asset-kind presence by project type.
- Policy: caption term risk detection for high-risk classes.
