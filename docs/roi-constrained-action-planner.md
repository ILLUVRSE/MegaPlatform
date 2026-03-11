# Phase 163 - ROI-Constrained Action Planner

Phase 163 adds modeled ROI gating to autonomous financial approvals.

## Policy

`ops/governance/roi-constrained-action-planner.json` defines minimum ROI ratio, confidence floor, payback horizon, and positive net-value requirements.

## Runtime

`apps/web/lib/roiConstrainedActionPlanner.ts` computes modeled ROI and blocks actions that fail policy thresholds.

## API

`POST /api/admin/finance/roi-planner/evaluate` enforces ROI-constrained approval decisions for autonomous actions.

This satisfies phase 163 by requiring modeled ROI above policy minimums for approval.
