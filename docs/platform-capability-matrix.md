# Platform Capability Matrix (Phase 29)

Source of truth:
- `ops/governance/capability-matrix.json`

Maturity values:
- `planned`
- `partial`
- `implemented`

This matrix maps capabilities to owning domains and code surfaces.

## Current Snapshot

- Implemented: auth/RBAC, watch platform, party core, studio pipeline, feed/shorts, external module shell, governance guardrails.
- Partial: local ops queue, policy evaluators, and bounded autonomy/admin control surfaces.
- Planned: feature store + candidate retrieval unification.

## Rule

Any new platform-level capability must be added to `capability-matrix.json` with:
- domain
- owner
- maturity
- primary code paths
