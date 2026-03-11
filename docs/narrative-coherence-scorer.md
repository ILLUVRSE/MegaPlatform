# Narrative Coherence Scorer

Phase 145 adds a policy-governed coherence scorer for long-running multi-format narrative arcs.

## Scope
- Coherence policy: `ops/governance/narrative-coherence-scorer.json`
- Runtime scorer: `apps/web/lib/narrativeCoherenceScorer.ts`
- Admin API: `POST /api/admin/trust/narrative/coherence/score`

## Behavior
- Scores narrative coherence using sequence-jump and missing-context-link penalties.
- Enforces minimum coherence thresholds and optional hard block on missing core links.
- Returns coherence score and gating evidence to prevent incoherent sequencing.
