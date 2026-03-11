# Autonomous Content Programming Director

Phase 113 adds cross-surface autonomous programming plans with safety-aware controls.

Current reality:
- This document describes a planning/evaluation surface.
- It does not imply that cross-surface programming is fully self-driving across the whole platform.

## Governance Policy

- `ops/governance/content-programming-director.json`

## Runtime

- `apps/web/lib/contentProgrammingDirector.ts`

Generates candidate placement plans across allowed surfaces with policy-bounded limits.

## API

- `POST /api/admin/ecosystem/programming/plan`
