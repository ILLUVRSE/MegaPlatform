# Ecosystem Certification Pipeline

Phase 100 adds a policy-driven certification gate that modules must pass before publication.

## Policy Registry

- `ops/governance/ecosystem-certification.json`

## API

- `POST /api/admin/apps/certification/publish`

The publish endpoint runs required automated checks and blocks publication when any required check fails.
