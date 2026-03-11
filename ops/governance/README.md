# Governance Manifests

These JSON files define platform guardrails used by admin governance APIs:

- `slos.json`: service-level objectives used in observability status.
- `budgets.json`: monthly budget controls and warn/breach thresholds.
- `deployment.json`: required environment variables by promotion stage.
- `compliance-controls.json`: required compliance controls and evidence file paths.
- `launch-gates.json`: launch gates built from SLO/budget/compliance/deployment checks.
- `domain-map.json`: canonical domain ownership map and primary path boundaries.
- `capability-matrix.json`: capability ownership and maturity map.
- `agent-roles.json`: control-plane role contract definitions.
- `agent-capabilities.json`: per-agent allowed actions.
- `agent-safe-actions.json`: action-level risk and block policy.
- `agent-approval-checkpoints.json`: human-approval requirements for protected actions.
- `agent-budgets.json`: action/token budgets per agent.
- `agent-slos.json`: reliability targets for autonomous control loops.
- `service-dependencies.json`: runtime dependency criticality and health-check matrix.
- `failure-drills.json`: scheduled safe-mode failure injection drills.
- `incident-automation-actions.json`: safe incident response actions and severity policy.
- `data-retention-policies.json`: retention/deletion policy by data class and evidence path.
- `key-rotation.json`: secret rotation policy with max age and last rotated evidence.
- `rbac-baseline.json`: role-to-permission baseline for permission drift detection.
- `supply-chain-policy.json`: vulnerability blocking thresholds and package blocklist/allowlist.
- `dsar-workflows.json`: DSAR export/delete workflow definitions and evidence targets.
- `production-certification.json`: required checks to certify high-risk production launches.
- `objectives.json`: measurable global/module objective registry for autonomous loops.
- `hypothesis-generation.json`: anomaly-to-hypothesis generation policy for optimization agents.
- `simulation-policy.json`: simulation requirements and rollout preflight thresholds.
- `micro-experiments.json`: bounded auto-experiment execution policy.
- `rollout-guardrails.json`: metric regression thresholds and auto-rollback policy.
- `learning-consolidation.json`: promotion policy for turning experiment outcomes into memory patterns.
- `cross-module-coordinator.json`: weighting policy for ecosystem-level optimization planning.
- `trust-safety-optimizer.json`: constraints for jointly optimizing engagement and safety.
- `cost-aware-optimizer.json`: cost ceilings for optimization action planning.
- `autonomous-loop-review.json`: SLO thresholds and override-runbook requirement for loop reliability review.
- `external-module-sdk.json`: required SDK manifest fields and category support for external modules.
- `federation-gateway.json`: trusted issuers and allowed scopes for federated access tokens.
- `ingestion-connectors.json`: enabled content ingestion connectors and source metadata.
- `creator-portability.json`: payload and asset-count safeguards for creator import/export portability APIs.
- `partner-governance.json`: partner policy contracts required before module activation.
- `open-telemetry-bridge.json`: enabled external telemetry sources and mapping rules into canonical platform events.
- `multi-tenant-controls.json`: tenant allowlists for API path, module access, and row-level ownership boundaries.
- `i18n-foundation.json`: default/supported locales with region mappings and locale path prefixes.
- `edge-delivery.json`: edge POP routing map and p95 latency budgets for key module prefixes.
- `ecosystem-certification.json`: required automated checks and category policy for gating module publication.

All files are validated by `pnpm governance:check`.
