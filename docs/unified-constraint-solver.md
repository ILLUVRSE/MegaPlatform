# Unified Constraint Solver

Phase 122 adds a deterministic solver that evaluates compiled autonomy policies across domains.

## Scope
- Solver policy: `ops/governance/unified-constraint-solver.json`
- Runtime solver: `apps/web/lib/unifiedConstraintSolver.ts`
- Admin API: `POST /api/admin/autonomy/constraints/solve`

## Behavior
- Consumes compiled rules from the autonomy policy compiler.
- Matches `global` and domain-scoped rules against request attributes.
- Resolves by highest priority, then strictest effect ordering (`deny`, `require_approval`, `allow`).
- Emits deterministic trace metadata to explain winning and conflicting rule paths.
