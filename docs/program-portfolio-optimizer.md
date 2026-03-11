# Program Portfolio Optimizer

Phase 107 adds impact/risk/cost-based roadmap reprioritization with evidence-backed recommendations.

## Governance Policy

- `ops/governance/program-portfolio-optimizer.json`

Defines scoring weights and required evidence fields.

## Runtime

- `apps/web/lib/programPortfolioOptimizer.ts`

Computes scored recommendations and priority ordering for initiative portfolios.

## API

- `POST /api/admin/governance/portfolio/optimize`
