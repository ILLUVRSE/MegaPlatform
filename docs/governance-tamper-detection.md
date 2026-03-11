# Governance Tamper Detection

Phase 136 adds integrity scanning for governance artifacts.

## Scope
- Tamper policy: `ops/governance/governance-tamper-detection.json`
- Runtime scanner: `apps/web/lib/governanceTamperDetection.ts`
- Integrity snapshot artifact: `ops/logs/governance-integrity-snapshot.json`
- Admin API: `POST /api/admin/security/governance/tamper/scan`

## Behavior
- Hashes monitored governance JSON files using SHA-256.
- Compares against prior snapshot to detect tampered or removed artifacts.
- Emits machine-readable integrity evidence for response workflows.
