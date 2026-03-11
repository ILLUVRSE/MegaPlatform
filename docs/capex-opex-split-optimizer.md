# Phase 165 - CapEx/OpEx Split Optimizer

Phase 165 adds policy-driven workload routing between CapEx and OpEx execution modes.

- Policy: `ops/governance/capex-opex-split-optimizer.json`
- Runtime: `apps/web/lib/capexOpexSplitOptimizer.ts`
- API: `POST /api/admin/finance/capex-opex/optimize`

Execution plans now include policy-optimized capex/opex tradeoff decisions.
