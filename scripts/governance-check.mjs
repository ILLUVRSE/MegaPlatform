#!/usr/bin/env node
import { readFileSync } from "fs";
import path from "path";

const root = process.cwd();
const governanceDir = path.join(root, "ops", "governance");

const files = [
  "slos.json",
  "budgets.json",
  "deployment.json",
  "compliance-controls.json",
  "launch-gates.json",
  "domain-map.json",
  "capability-matrix.json",
  "agent-roles.json",
  "agent-capabilities.json",
  "agent-safe-actions.json",
  "agent-approval-checkpoints.json",
  "agent-budgets.json",
  "agent-slos.json",
  "design-tokens-v2.json",
  "service-dependencies.json",
  "failure-drills.json",
  "incident-automation-actions.json",
  "data-retention-policies.json",
  "key-rotation.json",
  "rbac-baseline.json",
  "supply-chain-policy.json",
  "dsar-workflows.json",
  "production-certification.json",
  "objectives.json",
  "hypothesis-generation.json",
  "simulation-policy.json",
  "micro-experiments.json",
  "rollout-guardrails.json",
  "learning-consolidation.json",
  "cross-module-coordinator.json",
  "trust-safety-optimizer.json",
  "cost-aware-optimizer.json",
  "autonomous-loop-review.json",
  "external-module-sdk.json",
  "federation-gateway.json",
  "ingestion-connectors.json",
  "creator-portability.json",
  "partner-governance.json",
  "open-telemetry-bridge.json",
  "multi-tenant-controls.json",
  "i18n-foundation.json",
  "edge-delivery.json",
  "ecosystem-certification.json",
  "policy-engine-v2.json",
  "decision-journal.json",
  "governance-drift-monitor.json",
  "org-role-simulator.json",
  "inter-agent-conflicts.json",
  "executive-briefing.json",
  "program-portfolio-optimizer.json",
  "autonomous-audit-prep.json",
  "trustworthy-ai-score.json",
  "governance-stress-tests.json",
  "ecosystem-state-model.json",
  "adaptive-goal-selection.json",
  "content-programming-director.json",
  "multi-modal-narrative.json",
  "community-co-creation.json",
  "self-healing-behaviors.json",
  "long-horizon-memory.json",
  "emergent-behavior-monitoring.json",
  "autonomous-maturity-certification.json",
  "organism-mode-v1.json",
  "autonomy-policy-compiler.json",
  "autonomy-policies.json",
  "unified-constraint-solver.json",
  "strategic-intent-contract.json",
  "cross-loop-priority-arbiter.json",
  "autonomy-blast-radius-guardrails.json",
  "temporal-policy-windows.json",
  "policy-explainability.json",
  "autonomy-change-budgeting.json",
  "global-rollback-orchestrator.json",
  "autonomy-control-plane-v3.json",
  "continuous-red-team-simulator.json",
  "synthetic-incident-replay-grid.json",
  "deception-manipulation-detection.json",
  "autonomous-insider-risk-controls.json",
  "model-output-provenance-ledger.json",
  "governance-tamper-detection.json",
  "autonomous-secrets-minimization.json",
  "safety-regression-gate.json",
  "multi-region-failure-sovereignty.json",
  "resilience-certification-v1.json",
  "personalization-ethics-layer.json",
  "user-agency-controls-v2.json",
  "intent-aware-session-planner.json",
  "cross-format-continuity-engine.json",
  "narrative-coherence-scorer.json",
  "contextual-moderation-escalation.json",
  "adaptive-friction-system.json",
  "trust-preserving-growth-engine.json",
  "emotional-safety-signals-v1.json",
  "human-in-the-loop-experience-console.json",
  "creator-autonomy-contracts.json",
  "rights-aware-agent-editing-v2.json",
  "creator-ai-revenue-share-engine.json",
  "attribution-graph-v2.json",
  "autonomous-sponsorship-compliance.json",
  "dynamic-licensing-resolver.json",
  "creator-risk-score-v1.json",
  "reputation-weighted-distribution.json",
  "dispute-resolution-automation.json",
  "creator-governance-council-api.json",
  "autonomous-finance-controller.json",
  "forecast-vs-actual-drift-engine.json",
  "roi-constrained-action-planner.json",
  "token-economy-stabilizer.json",
  "capex-opex-split-optimizer.json",
  "carbon-aware-autonomy-scheduler.json",
  "marketplace-integrity-monitor.json",
  "fraud-adaptive-reward-guardrails.json",
  "revenue-stress-testing-suite.json",
  "financial-governance-certification-v1.json",
  "global-compliance-federation.json",
  "regulatory-change-ingestion-loop.json",
  "evidence-graph-for-audits.json",
  "automated-control-testing-v2.json",
  "privacy-risk-runtime-scoring.json",
  "sensitive-context-isolation-v1.json",
  "child-safety-autonomy-constraints.json",
  "cross-border-data-routing-policy.json",
  "legal-explainability-dossier-generator.json",
  "continuous-compliance-certification-gate.json",
  "meta-learning-policy-optimizer.json",
  "autonomous-strategy-simulator-v2.json",
  "institutional-memory-consolidation-v2.json",
  "goal-evolution-engine.json",
  "multi-quarter-roadmap-synthesizer.json",
  "unknown-unknown-discovery-loop.json",
  "collective-agent-deliberation-protocol.json",
  "autonomy-confidence-calibration-v2.json",
  "strategic-failure-recovery-planner.json",
  "long-horizon-value-alignment-monitor.json",
  "organism-mode-v2.json",
  "self-governance-charter-engine.json",
  "autonomous-constitutional-tests.json",
  "human-oversight-marketplaces.json",
  "socio-technical-health-index.json",
  "ecosystem-antifragility-loop.json",
  "open-autonomy-transparency-portal.json",
  "third-party-assurance-interface.json",
  "autonomous-stewardship-program.json",
  "organism-mode-v3-stewarded-intelligence-fabric.json",
  "openxr-webxr-contract-v1.json",
  "device-capability-matrix-xr.json",
  "spatial-identity-anchors.json",
  "scene-graph-contract-v1.json",
  "spatial-asset-streaming.json",
  "world-origin-relocalization.json",
  "input-abstraction-layer-xr.json",
  "spatial-telemetry-taxonomy-v1.json",
  "xr-config-contract-enforcement.json",
  "spatial-boundary-linting.json",
  "gesture-intent-runtime-v1.json",
  "gaze-attention-model.json",
  "voice-command-layer-xr.json",
  "haptics-orchestration-v1.json",
  "spatial-ui-grammar.json",
  "comfort-locomotion-suite.json",
  "co-presence-core-v1.json",
  "party-rooms-xr.json",
  "networked-object-sync-v1.json",
  "presence-reliability-slos.json",
  "animation-data-model-v1.json",
  "rig-contract-standardization.json",
  "retargeting-engine-v1.json",
  "blend-tree-runtime-v1.json",
  "ik-fk-solver-service.json",
  "secondary-motion-physics.json",
  "facial-animation-baseline.json",
  "lip-sync-and-viseme-runtime.json",
  "animation-event-timeline.json",
  "animation-quality-gate-v1.json",
  "mocap-ingestion-pipeline-v1.json",
  "live-mocap-streaming-runtime.json",
  "markerless-capture-integration.json",
  "mocap-cleanup-and-smoothing-toolkit.json",
  "performance-to-rig-mapping-layer.json",
  "crowd-animation-system-v1.json",
  "procedural-locomotion-runtime.json",
  "emotion-to-animation-controller.json",
  "character-state-machine-v2.json",
  "character-performance-slos.json",
  "world-authoring-contract-v1.json",
  "terrain-and-scale-governance.json",
  "xr-lighting-pipeline.json",
  "spatial-audio-runtime-v1.json",
  "volumetric-effects-framework.json",
  "cinematic-camera-rig-system.json",
  "cutscene-sequencer-v1.json",
  "story-beat-orchestrator.json",
  "environmental-storytelling-agent-hooks.json",
  "world-coherence-validator.json",
  "xr-creator-workspace-v1.json",
  "node-based-animation-graph-editor.json",
  "spatial-template-marketplace.json",
  "asset-kitbashing-toolchain.json",
  "in-app-rigging-assistant.json",
  "animation-preset-library.json",
  "collaborative-scene-editing.json",
  "publish-to-xr-pipeline.json",
  "creator-qa-simulation-harness.json",
  "creator-xr-analytics-dashboard.json",
  "shared-live-event-stages.json",
  "audience-choreography-engine.json",
  "virtual-production-control-room.json",
  "performer-avatar-switching.json",
  "crowd-reaction-animation-systems.json",
  "interactive-narrative-branching-xr.json",
  "real-time-event-moderation-xr.json",
  "replay-and-highlight-capture.json",
  "live-event-failover-drills.json",
  "event-readiness-certification-gate.json",
  "foveated-rendering-support.json",
  "dynamic-resolution-governor.json",
  "occlusion-culling-optimizer.json",
  "animation-lod-orchestration.json",
  "gpu-budget-controller.json",
  "cpu-frame-budget-controller.json",
  "90-120hz-readiness-program.json",
  "thermal-battery-adaptation.json",
  "network-jitter-compensation-avatar-motion.json",
  "xr-performance-regression-gate.json",
  "youth-safe-xr-mode.json",
  "spatial-harassment-detection.json",
  "proximity-safety-envelopes.json",
  "comfort-motion-risk-labels.json",
  "motion-sickness-risk-scoring.json",
  "3d-accessibility-baseline-v1.json",
  "consent-session-recording-controls.json",
  "biometric-privacy-boundaries.json",
  "regional-xr-compliance-overlays.json",
  "xr-audit-explainability-bundle.json",
  "avatar-economy-v1.json",
  "virtual-goods-ownership-physics-contract.json",
  "cross-platform-xr-asset-portability.json",
  "animation-performance-rights-automation.json",
  "live-performance-revenue-share-engine.json",
  "xr-asset-marketplace-fraud-controls.json",
  "xr-world-discovery-ranking.json",
  "distribution-orchestrator-vr-ar-endpoints.json",
  "xr-launch-readiness-store-compliance.json",
  "xr-autonomy-maturity-certification-v1.json"
];

let failed = false;
const simpleObjectPolicyFiles = new Set([
  "global-compliance-federation.json",
  "regulatory-change-ingestion-loop.json",
  "evidence-graph-for-audits.json",
  "automated-control-testing-v2.json",
  "privacy-risk-runtime-scoring.json",
  "sensitive-context-isolation-v1.json",
  "child-safety-autonomy-constraints.json",
  "cross-border-data-routing-policy.json",
  "legal-explainability-dossier-generator.json",
  "continuous-compliance-certification-gate.json",
  "meta-learning-policy-optimizer.json",
  "autonomous-strategy-simulator-v2.json",
  "institutional-memory-consolidation-v2.json",
  "goal-evolution-engine.json",
  "multi-quarter-roadmap-synthesizer.json",
  "unknown-unknown-discovery-loop.json",
  "collective-agent-deliberation-protocol.json",
  "autonomy-confidence-calibration-v2.json",
  "strategic-failure-recovery-planner.json",
  "long-horizon-value-alignment-monitor.json",
  "organism-mode-v2.json",
  "self-governance-charter-engine.json",
  "autonomous-constitutional-tests.json",
  "human-oversight-marketplaces.json",
  "socio-technical-health-index.json",
  "ecosystem-antifragility-loop.json",
  "open-autonomy-transparency-portal.json",
  "third-party-assurance-interface.json",
  "autonomous-stewardship-program.json",
  "organism-mode-v3-stewarded-intelligence-fabric.json",
  "openxr-webxr-contract-v1.json",
  "device-capability-matrix-xr.json",
  "spatial-identity-anchors.json",
  "scene-graph-contract-v1.json",
  "spatial-asset-streaming.json",
  "world-origin-relocalization.json",
  "input-abstraction-layer-xr.json",
  "spatial-telemetry-taxonomy-v1.json",
  "xr-config-contract-enforcement.json",
  "spatial-boundary-linting.json",
  "gesture-intent-runtime-v1.json",
  "gaze-attention-model.json",
  "voice-command-layer-xr.json",
  "haptics-orchestration-v1.json",
  "spatial-ui-grammar.json",
  "comfort-locomotion-suite.json",
  "co-presence-core-v1.json",
  "party-rooms-xr.json",
  "networked-object-sync-v1.json",
  "presence-reliability-slos.json",
  "animation-data-model-v1.json",
  "rig-contract-standardization.json",
  "retargeting-engine-v1.json",
  "blend-tree-runtime-v1.json",
  "ik-fk-solver-service.json",
  "secondary-motion-physics.json",
  "facial-animation-baseline.json",
  "lip-sync-and-viseme-runtime.json",
  "animation-event-timeline.json",
  "animation-quality-gate-v1.json",
  "mocap-ingestion-pipeline-v1.json",
  "live-mocap-streaming-runtime.json",
  "markerless-capture-integration.json",
  "mocap-cleanup-and-smoothing-toolkit.json",
  "performance-to-rig-mapping-layer.json",
  "crowd-animation-system-v1.json",
  "procedural-locomotion-runtime.json",
  "emotion-to-animation-controller.json",
  "character-state-machine-v2.json",
  "character-performance-slos.json",
  "world-authoring-contract-v1.json",
  "terrain-and-scale-governance.json",
  "xr-lighting-pipeline.json",
  "spatial-audio-runtime-v1.json",
  "volumetric-effects-framework.json",
  "cinematic-camera-rig-system.json",
  "cutscene-sequencer-v1.json",
  "story-beat-orchestrator.json",
  "environmental-storytelling-agent-hooks.json",
  "world-coherence-validator.json",
  "xr-creator-workspace-v1.json",
  "node-based-animation-graph-editor.json",
  "spatial-template-marketplace.json",
  "asset-kitbashing-toolchain.json",
  "in-app-rigging-assistant.json",
  "animation-preset-library.json",
  "collaborative-scene-editing.json",
  "publish-to-xr-pipeline.json",
  "creator-qa-simulation-harness.json",
  "creator-xr-analytics-dashboard.json",
  "shared-live-event-stages.json",
  "audience-choreography-engine.json",
  "virtual-production-control-room.json",
  "performer-avatar-switching.json",
  "crowd-reaction-animation-systems.json",
  "interactive-narrative-branching-xr.json",
  "real-time-event-moderation-xr.json",
  "replay-and-highlight-capture.json",
  "live-event-failover-drills.json",
  "event-readiness-certification-gate.json",
  "foveated-rendering-support.json",
  "dynamic-resolution-governor.json",
  "occlusion-culling-optimizer.json",
  "animation-lod-orchestration.json",
  "gpu-budget-controller.json",
  "cpu-frame-budget-controller.json",
  "90-120hz-readiness-program.json",
  "thermal-battery-adaptation.json",
  "network-jitter-compensation-avatar-motion.json",
  "xr-performance-regression-gate.json",
  "youth-safe-xr-mode.json",
  "spatial-harassment-detection.json",
  "proximity-safety-envelopes.json",
  "comfort-motion-risk-labels.json",
  "motion-sickness-risk-scoring.json",
  "3d-accessibility-baseline-v1.json",
  "consent-session-recording-controls.json",
  "biometric-privacy-boundaries.json",
  "regional-xr-compliance-overlays.json",
  "xr-audit-explainability-bundle.json",
  "avatar-economy-v1.json",
  "virtual-goods-ownership-physics-contract.json",
  "cross-platform-xr-asset-portability.json",
  "animation-performance-rights-automation.json",
  "live-performance-revenue-share-engine.json",
  "xr-asset-marketplace-fraud-controls.json",
  "xr-world-discovery-ranking.json",
  "distribution-orchestrator-vr-ar-endpoints.json",
  "xr-launch-readiness-store-compliance.json",
  "xr-autonomy-maturity-certification-v1.json"
]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSimplePolicyObject(file, policy) {
  if (!isObject(policy) || Object.keys(policy).length === 0) {
    process.stderr.write(`[governance-check] FAIL ${file}: expected non-empty object\n`);
    return false;
  }
  process.stdout.write(`[governance-check] PASS ${file}: policy shape valid\n`);
  return true;
}

function validateDomainMap(rows) {
  let hasFailure = false;
  const ids = new Set();
  const ownedPaths = new Map();

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL domain-map.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, name, owner, primaryPaths } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL domain-map.json: row ${index} missing non-empty string id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL domain-map.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }

    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL domain-map.json: row ${index} missing non-empty string name\n`);
      hasFailure = true;
    }

    if (typeof owner !== "string" || owner.trim() === "") {
      process.stderr.write(`[governance-check] FAIL domain-map.json: row ${index} missing non-empty string owner\n`);
      hasFailure = true;
    }

    if (!Array.isArray(primaryPaths) || primaryPaths.length === 0) {
      process.stderr.write(`[governance-check] FAIL domain-map.json: row ${index} requires non-empty primaryPaths array\n`);
      hasFailure = true;
      continue;
    }

    for (const rawPath of primaryPaths) {
      if (typeof rawPath !== "string" || rawPath.trim() === "") {
        process.stderr.write(
          `[governance-check] FAIL domain-map.json: row ${index} has invalid primary path value '${String(rawPath)}'\n`
        );
        hasFailure = true;
        continue;
      }

      const normalized = rawPath.trim();
      const existing = ownedPaths.get(normalized);
      if (existing && existing !== id) {
        process.stderr.write(
          `[governance-check] FAIL domain-map.json: path '${normalized}' is owned by both '${existing}' and '${id}'\n`
        );
        hasFailure = true;
      } else {
        ownedPaths.set(normalized, id);
      }
    }
  }

  if (!hasFailure) {
    process.stdout.write(
      `[governance-check] PASS domain-map.json: ${rows.length} domains, ${ownedPaths.size} unique primary paths\n`
    );
  }

  return !hasFailure;
}

function validateCapabilityMatrix(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedMaturity = new Set(["planned", "partial", "implemented"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, name, owner, domain, maturity, paths } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }

    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: row ${index} missing name\n`);
      hasFailure = true;
    }
    if (typeof owner !== "string" || owner.trim() === "") {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: row ${index} missing owner\n`);
      hasFailure = true;
    }
    if (typeof domain !== "string" || domain.trim() === "") {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: row ${index} missing domain\n`);
      hasFailure = true;
    }
    if (typeof maturity !== "string" || !allowedMaturity.has(maturity)) {
      process.stderr.write(
        `[governance-check] FAIL capability-matrix.json: row ${index} has invalid maturity '${String(maturity)}'\n`
      );
      hasFailure = true;
    }
    if (!Array.isArray(paths) || paths.length === 0) {
      process.stderr.write(`[governance-check] FAIL capability-matrix.json: row ${index} requires non-empty paths\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS capability-matrix.json: ${rows.length} capabilities\n`);
  }
  return !hasFailure;
}

function validateDesignTokens(rows) {
  let hasFailure = false;
  const names = new Set();
  const allowedCategories = new Set(["color", "type", "spacing", "radius", "depth", "motion"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL design-tokens-v2.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { name, category, value } = row;
    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL design-tokens-v2.json: row ${index} missing token name\n`);
      hasFailure = true;
    } else if (names.has(name)) {
      process.stderr.write(`[governance-check] FAIL design-tokens-v2.json: duplicate token '${name}'\n`);
      hasFailure = true;
    } else {
      names.add(name);
    }

    if (typeof category !== "string" || !allowedCategories.has(category)) {
      process.stderr.write(
        `[governance-check] FAIL design-tokens-v2.json: row ${index} invalid category '${String(category)}'\n`
      );
      hasFailure = true;
    }

    if (typeof value !== "string" || value.trim() === "") {
      process.stderr.write(`[governance-check] FAIL design-tokens-v2.json: row ${index} missing token value\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS design-tokens-v2.json: ${rows.length} tokens\n`);
  }
  return !hasFailure;
}

function validateServiceDependencies(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedKinds = new Set(["database", "cache", "storage", "queue", "realtime", "internal_api"]);
  const allowedCriticality = new Set(["critical", "high", "medium", "low"]);
  const allowedChecks = new Set(["db_query", "env_present", "always_healthy"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, name, kind, criticality, blastRadius, check, envKeys } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }

    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} missing name\n`);
      hasFailure = true;
    }
    if (typeof kind !== "string" || !allowedKinds.has(kind)) {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} invalid kind '${String(kind)}'\n`);
      hasFailure = true;
    }
    if (typeof criticality !== "string" || !allowedCriticality.has(criticality)) {
      process.stderr.write(
        `[governance-check] FAIL service-dependencies.json: row ${index} invalid criticality '${String(criticality)}'\n`
      );
      hasFailure = true;
    }
    if (typeof blastRadius !== "string" || blastRadius.trim() === "") {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} missing blastRadius\n`);
      hasFailure = true;
    }
    if (typeof check !== "string" || !allowedChecks.has(check)) {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} invalid check '${String(check)}'\n`);
      hasFailure = true;
    }
    if (!Array.isArray(envKeys)) {
      process.stderr.write(`[governance-check] FAIL service-dependencies.json: row ${index} envKeys must be array\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS service-dependencies.json: ${rows.length} dependencies\n`);
  }

  return !hasFailure;
}

function validateFailureDrills(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedTargets = new Set(["queue", "storage", "realtime"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, name, target, cadence, maxDurationMin, safeModeOnly } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} missing name\n`);
      hasFailure = true;
    }
    if (typeof target !== "string" || !allowedTargets.has(target)) {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} invalid target '${String(target)}'\n`);
      hasFailure = true;
    }
    if (typeof cadence !== "string" || cadence.trim() === "") {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} missing cadence\n`);
      hasFailure = true;
    }
    if (!Number.isInteger(maxDurationMin) || maxDurationMin <= 0) {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} invalid maxDurationMin\n`);
      hasFailure = true;
    }
    if (typeof safeModeOnly !== "boolean") {
      process.stderr.write(`[governance-check] FAIL failure-drills.json: row ${index} safeModeOnly must be boolean\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS failure-drills.json: ${rows.length} drills\n`);
  }
  return !hasFailure;
}

function validateIncidentAutomationActions(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedSeverities = new Set(["SEV-1", "SEV-2", "SEV-3"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL incident-automation-actions.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, name, severity, safe, steps } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL incident-automation-actions.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL incident-automation-actions.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL incident-automation-actions.json: row ${index} missing name\n`);
      hasFailure = true;
    }
    if (typeof severity !== "string" || !allowedSeverities.has(severity)) {
      process.stderr.write(
        `[governance-check] FAIL incident-automation-actions.json: row ${index} invalid severity '${String(severity)}'\n`
      );
      hasFailure = true;
    }
    if (typeof safe !== "boolean") {
      process.stderr.write(`[governance-check] FAIL incident-automation-actions.json: row ${index} safe must be boolean\n`);
      hasFailure = true;
    }
    if (!Array.isArray(steps) || steps.length === 0 || steps.some((step) => typeof step !== "string" || step.trim() === "")) {
      process.stderr.write(`[governance-check] FAIL incident-automation-actions.json: row ${index} invalid steps\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS incident-automation-actions.json: ${rows.length} actions\n`);
  }
  return !hasFailure;
}

function validateDataRetentionPolicies(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedModes = new Set(["delete", "anonymize"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL data-retention-policies.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, dataClass, retentionDays, deletionMode, evidencePath } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL data-retention-policies.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL data-retention-policies.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof dataClass !== "string" || dataClass.trim() === "") {
      process.stderr.write(`[governance-check] FAIL data-retention-policies.json: row ${index} missing dataClass\n`);
      hasFailure = true;
    }
    if (!Number.isInteger(retentionDays) || retentionDays < 0) {
      process.stderr.write(`[governance-check] FAIL data-retention-policies.json: row ${index} invalid retentionDays\n`);
      hasFailure = true;
    }
    if (typeof deletionMode !== "string" || !allowedModes.has(deletionMode)) {
      process.stderr.write(
        `[governance-check] FAIL data-retention-policies.json: row ${index} invalid deletionMode '${String(deletionMode)}'\n`
      );
      hasFailure = true;
    }
    if (typeof evidencePath !== "string" || evidencePath.trim() === "") {
      process.stderr.write(`[governance-check] FAIL data-retention-policies.json: row ${index} missing evidencePath\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS data-retention-policies.json: ${rows.length} policies\n`);
  }
  return !hasFailure;
}

function validateKeyRotationPolicies(rows) {
  let hasFailure = false;
  const ids = new Set();

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, secretRef, owner, maxAgeDays, lastRotatedAt } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof secretRef !== "string" || secretRef.trim() === "") {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: row ${index} missing secretRef\n`);
      hasFailure = true;
    }
    if (typeof owner !== "string" || owner.trim() === "") {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: row ${index} missing owner\n`);
      hasFailure = true;
    }
    if (!Number.isInteger(maxAgeDays) || maxAgeDays <= 0) {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: row ${index} invalid maxAgeDays\n`);
      hasFailure = true;
    }
    if (typeof lastRotatedAt !== "string" || !Number.isFinite(Date.parse(lastRotatedAt))) {
      process.stderr.write(`[governance-check] FAIL key-rotation.json: row ${index} invalid lastRotatedAt\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS key-rotation.json: ${rows.length} policies\n`);
  }
  return !hasFailure;
}

function validateRbacBaseline(rows) {
  let hasFailure = false;
  const roles = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL rbac-baseline.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { role, permissions } = row;
    if (typeof role !== "string" || role.trim() === "") {
      process.stderr.write(`[governance-check] FAIL rbac-baseline.json: row ${index} missing role\n`);
      hasFailure = true;
    } else if (roles.has(role)) {
      process.stderr.write(`[governance-check] FAIL rbac-baseline.json: duplicate role '${role}'\n`);
      hasFailure = true;
    } else {
      roles.add(role);
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      process.stderr.write(`[governance-check] FAIL rbac-baseline.json: row ${index} needs non-empty permissions\n`);
      hasFailure = true;
      continue;
    }
    if (permissions.some((perm) => typeof perm !== "string" || perm.trim() === "")) {
      process.stderr.write(`[governance-check] FAIL rbac-baseline.json: row ${index} has invalid permission value\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS rbac-baseline.json: ${rows.length} roles\n`);
  }
  return !hasFailure;
}

function validateSupplyChainPolicy(policy) {
  let hasFailure = false;
  const allowedSeverity = new Set(["critical", "high"]);
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL supply-chain-policy.json: expected object\n");
    return false;
  }

  if (typeof policy.failOnSeverity !== "string" || !allowedSeverity.has(policy.failOnSeverity)) {
    process.stderr.write(
      `[governance-check] FAIL supply-chain-policy.json: invalid failOnSeverity '${String(policy.failOnSeverity)}'\n`
    );
    hasFailure = true;
  }
  if (!Array.isArray(policy.blockedPackages)) {
    process.stderr.write("[governance-check] FAIL supply-chain-policy.json: blockedPackages must be array\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowlist)) {
    process.stderr.write("[governance-check] FAIL supply-chain-policy.json: allowlist must be array\n");
    hasFailure = true;
  }

  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS supply-chain-policy.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateHypothesisGenerationPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL hypothesis-generation.json: expected object\n");
    return false;
  }

  if (typeof policy.minAbsoluteDelta !== "number" || policy.minAbsoluteDelta < 0) {
    process.stderr.write("[governance-check] FAIL hypothesis-generation.json: invalid minAbsoluteDelta\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxHypothesesPerRun) || policy.maxHypothesesPerRun <= 0) {
    process.stderr.write("[governance-check] FAIL hypothesis-generation.json: invalid maxHypothesesPerRun\n");
    hasFailure = true;
  }
  if (typeof policy.defaultAgent !== "string" || policy.defaultAgent.trim() === "") {
    process.stderr.write("[governance-check] FAIL hypothesis-generation.json: invalid defaultAgent\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS hypothesis-generation.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateSimulationPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL simulation-policy.json: expected object\n");
    return false;
  }
  if (typeof policy.requiredBeforeRollout !== "boolean") {
    process.stderr.write("[governance-check] FAIL simulation-policy.json: requiredBeforeRollout must be boolean\n");
    hasFailure = true;
  }
  if (typeof policy.maxRiskScore !== "number" || policy.maxRiskScore < 0 || policy.maxRiskScore > 1) {
    process.stderr.write("[governance-check] FAIL simulation-policy.json: invalid maxRiskScore\n");
    hasFailure = true;
  }
  if (typeof policy.minConfidence !== "number" || policy.minConfidence < 0 || policy.minConfidence > 1) {
    process.stderr.write("[governance-check] FAIL simulation-policy.json: invalid minConfidence\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS simulation-policy.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateMicroExperimentsPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL micro-experiments.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxConcurrent) || policy.maxConcurrent <= 0) {
    process.stderr.write("[governance-check] FAIL micro-experiments.json: invalid maxConcurrent\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxDurationMin) || policy.maxDurationMin <= 0) {
    process.stderr.write("[governance-check] FAIL micro-experiments.json: invalid maxDurationMin\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedRisk) || policy.allowedRisk.length === 0) {
    process.stderr.write("[governance-check] FAIL micro-experiments.json: invalid allowedRisk\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS micro-experiments.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateLearningConsolidationPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL learning-consolidation.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.minWinsToPromote) || policy.minWinsToPromote <= 0) {
    process.stderr.write("[governance-check] FAIL learning-consolidation.json: invalid minWinsToPromote\n");
    hasFailure = true;
  }
  if (typeof policy.minConfidenceToPromote !== "number" || policy.minConfidenceToPromote < 0 || policy.minConfidenceToPromote > 1) {
    process.stderr.write("[governance-check] FAIL learning-consolidation.json: invalid minConfidenceToPromote\n");
    hasFailure = true;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL learning-consolidation.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS learning-consolidation.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCrossModuleCoordinatorPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL cross-module-coordinator.json: expected object\n");
    return false;
  }
  if (typeof policy.globalWeight !== "number" || policy.globalWeight < 0) {
    process.stderr.write("[governance-check] FAIL cross-module-coordinator.json: invalid globalWeight\n");
    hasFailure = true;
  }
  if (typeof policy.localWeight !== "number" || policy.localWeight < 0) {
    process.stderr.write("[governance-check] FAIL cross-module-coordinator.json: invalid localWeight\n");
    hasFailure = true;
  }
  if (typeof policy.safetyPenaltyWeight !== "number" || policy.safetyPenaltyWeight < 0) {
    process.stderr.write("[governance-check] FAIL cross-module-coordinator.json: invalid safetyPenaltyWeight\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS cross-module-coordinator.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateTrustSafetyOptimizerPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL trust-safety-optimizer.json: expected object\n");
    return false;
  }
  if (typeof policy.maxSafetyRisk !== "number" || policy.maxSafetyRisk < 0 || policy.maxSafetyRisk > 1) {
    process.stderr.write("[governance-check] FAIL trust-safety-optimizer.json: invalid maxSafetyRisk\n");
    hasFailure = true;
  }
  if (typeof policy.minSafetyMargin !== "number" || policy.minSafetyMargin < 0) {
    process.stderr.write("[governance-check] FAIL trust-safety-optimizer.json: invalid minSafetyMargin\n");
    hasFailure = true;
  }
  if (typeof policy.rejectUnsafeGainPatterns !== "boolean") {
    process.stderr.write("[governance-check] FAIL trust-safety-optimizer.json: rejectUnsafeGainPatterns must be boolean\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS trust-safety-optimizer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCostAwareOptimizerPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL cost-aware-optimizer.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxActionCostCents) || policy.maxActionCostCents <= 0) {
    process.stderr.write("[governance-check] FAIL cost-aware-optimizer.json: invalid maxActionCostCents\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxPlanCostCents) || policy.maxPlanCostCents <= 0) {
    process.stderr.write("[governance-check] FAIL cost-aware-optimizer.json: invalid maxPlanCostCents\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS cost-aware-optimizer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousLoopReviewPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-loop-review.json: expected object\n");
    return false;
  }
  if (typeof policy.minSuccessRate !== "number" || policy.minSuccessRate < 0 || policy.minSuccessRate > 1) {
    process.stderr.write("[governance-check] FAIL autonomous-loop-review.json: invalid minSuccessRate\n");
    hasFailure = true;
  }
  if (typeof policy.maxErrorRate !== "number" || policy.maxErrorRate < 0 || policy.maxErrorRate > 1) {
    process.stderr.write("[governance-check] FAIL autonomous-loop-review.json: invalid maxErrorRate\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxP95LatencyMs) || policy.maxP95LatencyMs <= 0) {
    process.stderr.write("[governance-check] FAIL autonomous-loop-review.json: invalid maxP95LatencyMs\n");
    hasFailure = true;
  }
  if (typeof policy.overrideRunbookPath !== "string" || policy.overrideRunbookPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL autonomous-loop-review.json: invalid overrideRunbookPath\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-loop-review.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateExternalModuleSdkPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL external-module-sdk.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.requiredFields) || policy.requiredFields.length === 0) {
    process.stderr.write("[governance-check] FAIL external-module-sdk.json: invalid requiredFields\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.supportedCategories) || policy.supportedCategories.length === 0) {
    process.stderr.write("[governance-check] FAIL external-module-sdk.json: invalid supportedCategories\n");
    hasFailure = true;
  }
  if (typeof policy.schemaVersion !== "string" || policy.schemaVersion.trim() === "") {
    process.stderr.write("[governance-check] FAIL external-module-sdk.json: invalid schemaVersion\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS external-module-sdk.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateFederationGatewayPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL federation-gateway.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.trustedIssuers) || policy.trustedIssuers.length === 0) {
    process.stderr.write("[governance-check] FAIL federation-gateway.json: invalid trustedIssuers\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedScopes) || policy.allowedScopes.length === 0) {
    process.stderr.write("[governance-check] FAIL federation-gateway.json: invalid allowedScopes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS federation-gateway.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCreatorPortabilityPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL creator-portability.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxAssetsPerRequest) || policy.maxAssetsPerRequest <= 0) {
    process.stderr.write("[governance-check] FAIL creator-portability.json: invalid maxAssetsPerRequest\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxPayloadBytes) || policy.maxPayloadBytes <= 0) {
    process.stderr.write("[governance-check] FAIL creator-portability.json: invalid maxPayloadBytes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS creator-portability.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateOpenTelemetryBridgePolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL open-telemetry-bridge.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.enabledSources) || policy.enabledSources.length === 0) {
    process.stderr.write("[governance-check] FAIL open-telemetry-bridge.json: invalid enabledSources\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.mappings) || policy.mappings.length === 0) {
    process.stderr.write("[governance-check] FAIL open-telemetry-bridge.json: invalid mappings\n");
    hasFailure = true;
  } else {
    for (const [index, mapping] of policy.mappings.entries()) {
      if (!isObject(mapping)) {
        process.stderr.write(`[governance-check] FAIL open-telemetry-bridge.json: mapping ${index} not object\n`);
        hasFailure = true;
        continue;
      }
      const keys = ["source", "event", "canonicalEvent", "canonicalSurface"];
      for (const key of keys) {
        if (typeof mapping[key] !== "string" || mapping[key].trim() === "") {
          process.stderr.write(
            `[governance-check] FAIL open-telemetry-bridge.json: mapping ${index} invalid ${key}\n`
          );
          hasFailure = true;
        }
      }
      if (!["source", "payload", "fixed"].includes(String(mapping.moduleStrategy))) {
        process.stderr.write(
          `[governance-check] FAIL open-telemetry-bridge.json: mapping ${index} invalid moduleStrategy\n`
        );
        hasFailure = true;
      }
    }
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS open-telemetry-bridge.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateMultiTenantControlsPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL multi-tenant-controls.json: expected object\n");
    return false;
  }
  if (typeof policy.defaultTenant !== "string" || policy.defaultTenant.trim() === "") {
    process.stderr.write("[governance-check] FAIL multi-tenant-controls.json: invalid defaultTenant\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.tenants) || policy.tenants.length === 0) {
    process.stderr.write("[governance-check] FAIL multi-tenant-controls.json: invalid tenants\n");
    hasFailure = true;
  } else {
    for (const [index, tenant] of policy.tenants.entries()) {
      if (!isObject(tenant)) {
        process.stderr.write(`[governance-check] FAIL multi-tenant-controls.json: tenant ${index} not object\n`);
        hasFailure = true;
        continue;
      }
      if (typeof tenant.id !== "string" || tenant.id.trim() === "") {
        process.stderr.write(`[governance-check] FAIL multi-tenant-controls.json: tenant ${index} invalid id\n`);
        hasFailure = true;
      }
      if (!Array.isArray(tenant.allowedPathPrefixes) || tenant.allowedPathPrefixes.length === 0) {
        process.stderr.write(
          `[governance-check] FAIL multi-tenant-controls.json: tenant ${index} invalid allowedPathPrefixes\n`
        );
        hasFailure = true;
      }
      if (!Array.isArray(tenant.allowedModules) || tenant.allowedModules.length === 0) {
        process.stderr.write(
          `[governance-check] FAIL multi-tenant-controls.json: tenant ${index} invalid allowedModules\n`
        );
        hasFailure = true;
      }
    }
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS multi-tenant-controls.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateI18nFoundationPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL i18n-foundation.json: expected object\n");
    return false;
  }
  if (typeof policy.defaultLocale !== "string" || policy.defaultLocale.trim() === "") {
    process.stderr.write("[governance-check] FAIL i18n-foundation.json: invalid defaultLocale\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.supportedLocales) || policy.supportedLocales.length === 0) {
    process.stderr.write("[governance-check] FAIL i18n-foundation.json: invalid supportedLocales\n");
    hasFailure = true;
  }
  if (!isObject(policy.regionDefaults)) {
    process.stderr.write("[governance-check] FAIL i18n-foundation.json: invalid regionDefaults\n");
    hasFailure = true;
  }
  if (!isObject(policy.localePrefixes)) {
    process.stderr.write("[governance-check] FAIL i18n-foundation.json: invalid localePrefixes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS i18n-foundation.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateEdgeDeliveryPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL edge-delivery.json: expected object\n");
    return false;
  }
  if (typeof policy.defaultPop !== "string" || policy.defaultPop.trim() === "") {
    process.stderr.write("[governance-check] FAIL edge-delivery.json: invalid defaultPop\n");
    hasFailure = true;
  }
  if (!isObject(policy.regionToPop)) {
    process.stderr.write("[governance-check] FAIL edge-delivery.json: invalid regionToPop\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.latencyBudgetsMs) || policy.latencyBudgetsMs.length === 0) {
    process.stderr.write("[governance-check] FAIL edge-delivery.json: invalid latencyBudgetsMs\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS edge-delivery.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateEcosystemCertificationPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL ecosystem-certification.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.requiredChecks) || policy.requiredChecks.length === 0) {
    process.stderr.write("[governance-check] FAIL ecosystem-certification.json: invalid requiredChecks\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedCategories) || policy.allowedCategories.length === 0) {
    process.stderr.write("[governance-check] FAIL ecosystem-certification.json: invalid allowedCategories\n");
    hasFailure = true;
  }
  if (typeof policy.allowHttpLocalhost !== "boolean") {
    process.stderr.write("[governance-check] FAIL ecosystem-certification.json: invalid allowHttpLocalhost\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS ecosystem-certification.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validatePolicyEngineV2(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL policy-engine-v2.json: expected object\n");
    return false;
  }
  if (typeof policy.version !== "string" || policy.version.trim() === "") {
    process.stderr.write("[governance-check] FAIL policy-engine-v2.json: invalid version\n");
    hasFailure = true;
  }
  if (policy.defaultEffect !== "allow" && policy.defaultEffect !== "deny") {
    process.stderr.write("[governance-check] FAIL policy-engine-v2.json: invalid defaultEffect\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.rules)) {
    process.stderr.write("[governance-check] FAIL policy-engine-v2.json: invalid rules\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS policy-engine-v2.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateDecisionJournalPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL decision-journal.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.requiredEvidenceKinds) || policy.requiredEvidenceKinds.length === 0) {
    process.stderr.write("[governance-check] FAIL decision-journal.json: invalid requiredEvidenceKinds\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredFields) || policy.requiredFields.length === 0) {
    process.stderr.write("[governance-check] FAIL decision-journal.json: invalid requiredFields\n");
    hasFailure = true;
  }
  if (typeof policy.minConfidence !== "number" || policy.minConfidence < 0 || policy.minConfidence > 1) {
    process.stderr.write("[governance-check] FAIL decision-journal.json: invalid minConfidence\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxEntryAgeDays) || policy.maxEntryAgeDays <= 0) {
    process.stderr.write("[governance-check] FAIL decision-journal.json: invalid maxEntryAgeDays\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS decision-journal.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateGovernanceDriftPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL governance-drift-monitor.json: expected object\n");
    return false;
  }
  if (typeof policy.maxMismatchRatio !== "number" || policy.maxMismatchRatio < 0 || policy.maxMismatchRatio > 1) {
    process.stderr.write("[governance-check] FAIL governance-drift-monitor.json: invalid maxMismatchRatio\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.minSampleSize) || policy.minSampleSize <= 0) {
    process.stderr.write("[governance-check] FAIL governance-drift-monitor.json: invalid minSampleSize\n");
    hasFailure = true;
  }
  if (policy.defaultSeverity !== "warning" && policy.defaultSeverity !== "critical") {
    process.stderr.write("[governance-check] FAIL governance-drift-monitor.json: invalid defaultSeverity\n");
    hasFailure = true;
  }
  if (typeof policy.escalateSeverityAt !== "number" || policy.escalateSeverityAt < 0 || policy.escalateSeverityAt > 1) {
    process.stderr.write("[governance-check] FAIL governance-drift-monitor.json: invalid escalateSeverityAt\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS governance-drift-monitor.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateOrgRoleSimulatorPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL org-role-simulator.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.roles) || policy.roles.length === 0) {
    process.stderr.write("[governance-check] FAIL org-role-simulator.json: invalid roles\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxTasksPerRole) || policy.maxTasksPerRole <= 0) {
    process.stderr.write("[governance-check] FAIL org-role-simulator.json: invalid maxTasksPerRole\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS org-role-simulator.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateInterAgentConflictsPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL inter-agent-conflicts.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.priorityOrder) || policy.priorityOrder.length === 0) {
    process.stderr.write("[governance-check] FAIL inter-agent-conflicts.json: invalid priorityOrder\n");
    hasFailure = true;
  }
  if (typeof policy.denyBeatsAllow !== "boolean") {
    process.stderr.write("[governance-check] FAIL inter-agent-conflicts.json: invalid denyBeatsAllow\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredTraceFields) || policy.requiredTraceFields.length === 0) {
    process.stderr.write("[governance-check] FAIL inter-agent-conflicts.json: invalid requiredTraceFields\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS inter-agent-conflicts.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateExecutiveBriefingPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL executive-briefing.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.requiredSections) || policy.requiredSections.length === 0) {
    process.stderr.write("[governance-check] FAIL executive-briefing.json: invalid requiredSections\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxItemsPerSection) || policy.maxItemsPerSection <= 0) {
    process.stderr.write("[governance-check] FAIL executive-briefing.json: invalid maxItemsPerSection\n");
    hasFailure = true;
  }
  if (policy.riskSeverityThreshold !== "warning" && policy.riskSeverityThreshold !== "critical") {
    process.stderr.write("[governance-check] FAIL executive-briefing.json: invalid riskSeverityThreshold\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS executive-briefing.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateProgramPortfolioOptimizerPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL program-portfolio-optimizer.json: expected object\n");
    return false;
  }
  if (!isObject(policy.weights)) {
    process.stderr.write("[governance-check] FAIL program-portfolio-optimizer.json: invalid weights\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.minEvidenceFields) || policy.minEvidenceFields.length === 0) {
    process.stderr.write("[governance-check] FAIL program-portfolio-optimizer.json: invalid minEvidenceFields\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS program-portfolio-optimizer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousAuditPrepPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-audit-prep.json: expected object\n");
    return false;
  }
  if (typeof policy.bundleName !== "string" || policy.bundleName.trim() === "") {
    process.stderr.write("[governance-check] FAIL autonomous-audit-prep.json: invalid bundleName\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredEvidence) || policy.requiredEvidence.length === 0) {
    process.stderr.write("[governance-check] FAIL autonomous-audit-prep.json: invalid requiredEvidence\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-audit-prep.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateTrustworthyAiScorePolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL trustworthy-ai-score.json: expected object\n");
    return false;
  }
  if (!isObject(policy.weights)) {
    process.stderr.write("[governance-check] FAIL trustworthy-ai-score.json: invalid weights\n");
    hasFailure = true;
  }
  if (!isObject(policy.thresholds)) {
    process.stderr.write("[governance-check] FAIL trustworthy-ai-score.json: invalid thresholds\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS trustworthy-ai-score.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateGovernanceStressTests(rows) {
  let hasFailure = false;
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }
    const { id, scope, action, attributes, expectedAllow, control } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} invalid id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof scope !== "string" || scope.trim() === "") {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} invalid scope\n`);
      hasFailure = true;
    }
    if (typeof action !== "string" || action.trim() === "") {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} invalid action\n`);
      hasFailure = true;
    }
    if (!isObject(attributes)) {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} invalid attributes\n`);
      hasFailure = true;
    }
    if (typeof expectedAllow !== "boolean") {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} invalid expectedAllow\n`);
      hasFailure = true;
    }
    if (typeof control !== "string" || control.trim() === "") {
      process.stderr.write(`[governance-check] FAIL governance-stress-tests.json: row ${index} invalid control\n`);
      hasFailure = true;
    }
  }
  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS governance-stress-tests.json: ${rows.length} scenarios\n`);
  }
  return !hasFailure;
}

function validateEcosystemStateModelPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL ecosystem-state-model.json: expected object\n");
    return false;
  }
  if (!isObject(policy.healthThresholds)) {
    process.stderr.write("[governance-check] FAIL ecosystem-state-model.json: invalid healthThresholds\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.momentumWindowHours) || policy.momentumWindowHours <= 0) {
    process.stderr.write("[governance-check] FAIL ecosystem-state-model.json: invalid momentumWindowHours\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS ecosystem-state-model.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAdaptiveGoalSelectionPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL adaptive-goal-selection.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxGoals) || policy.maxGoals <= 0) {
    process.stderr.write("[governance-check] FAIL adaptive-goal-selection.json: invalid maxGoals\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.blockedWhenActionLimit)) {
    process.stderr.write("[governance-check] FAIL adaptive-goal-selection.json: invalid blockedWhenActionLimit\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.preferredDomains) || policy.preferredDomains.length === 0) {
    process.stderr.write("[governance-check] FAIL adaptive-goal-selection.json: invalid preferredDomains\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS adaptive-goal-selection.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateContentProgrammingDirectorPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL content-programming-director.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxPlacementsPerPlan) || policy.maxPlacementsPerPlan <= 0) {
    process.stderr.write("[governance-check] FAIL content-programming-director.json: invalid maxPlacementsPerPlan\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedSurfaces) || policy.allowedSurfaces.length === 0) {
    process.stderr.write("[governance-check] FAIL content-programming-director.json: invalid allowedSurfaces\n");
    hasFailure = true;
  }
  if (typeof policy.requireSafetyReview !== "boolean") {
    process.stderr.write("[governance-check] FAIL content-programming-director.json: invalid requireSafetyReview\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS content-programming-director.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateMultiModalNarrativePolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL multi-modal-narrative.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.allowedFormats) || policy.allowedFormats.length === 0) {
    process.stderr.write("[governance-check] FAIL multi-modal-narrative.json: invalid allowedFormats\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxArcSteps) || policy.maxArcSteps <= 0) {
    process.stderr.write("[governance-check] FAIL multi-modal-narrative.json: invalid maxArcSteps\n");
    hasFailure = true;
  }
  if (typeof policy.requireSharedTheme !== "boolean") {
    process.stderr.write("[governance-check] FAIL multi-modal-narrative.json: invalid requireSharedTheme\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS multi-modal-narrative.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCommunityCoCreationPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL community-co-creation.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.requiredContributorTypes) || policy.requiredContributorTypes.length === 0) {
    process.stderr.write("[governance-check] FAIL community-co-creation.json: invalid requiredContributorTypes\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedModerationStates) || policy.allowedModerationStates.length === 0) {
    process.stderr.write("[governance-check] FAIL community-co-creation.json: invalid allowedModerationStates\n");
    hasFailure = true;
  }
  if (typeof policy.requireProvenance !== "boolean") {
    process.stderr.write("[governance-check] FAIL community-co-creation.json: invalid requireProvenance\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS community-co-creation.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateSelfHealingPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL self-healing-behaviors.json: expected object\n");
    return false;
  }
  if (typeof policy.maxErrorRate !== "number" || policy.maxErrorRate < 0 || policy.maxErrorRate > 1) {
    process.stderr.write("[governance-check] FAIL self-healing-behaviors.json: invalid maxErrorRate\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxLatencyMs) || policy.maxLatencyMs <= 0) {
    process.stderr.write("[governance-check] FAIL self-healing-behaviors.json: invalid maxLatencyMs\n");
    hasFailure = true;
  }
  if (typeof policy.requireRollbackPlan !== "boolean") {
    process.stderr.write("[governance-check] FAIL self-healing-behaviors.json: invalid requireRollbackPlan\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS self-healing-behaviors.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateLongHorizonMemoryPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL long-horizon-memory.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxEntries) || policy.maxEntries <= 0) {
    process.stderr.write("[governance-check] FAIL long-horizon-memory.json: invalid maxEntries\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredEvidenceKinds) || policy.requiredEvidenceKinds.length === 0) {
    process.stderr.write("[governance-check] FAIL long-horizon-memory.json: invalid requiredEvidenceKinds\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.strategyWindowDays) || policy.strategyWindowDays <= 0) {
    process.stderr.write("[governance-check] FAIL long-horizon-memory.json: invalid strategyWindowDays\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS long-horizon-memory.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateEmergentBehaviorPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL emergent-behavior-monitoring.json: expected object\n");
    return false;
  }
  if (typeof policy.noveltyThreshold !== "number" || policy.noveltyThreshold < 0 || policy.noveltyThreshold > 1) {
    process.stderr.write("[governance-check] FAIL emergent-behavior-monitoring.json: invalid noveltyThreshold\n");
    hasFailure = true;
  }
  if (typeof policy.riskThreshold !== "number" || policy.riskThreshold < 0 || policy.riskThreshold > 1) {
    process.stderr.write("[governance-check] FAIL emergent-behavior-monitoring.json: invalid riskThreshold\n");
    hasFailure = true;
  }
  if (
    typeof policy.opportunityThreshold !== "number" ||
    policy.opportunityThreshold < 0 ||
    policy.opportunityThreshold > 1
  ) {
    process.stderr.write("[governance-check] FAIL emergent-behavior-monitoring.json: invalid opportunityThreshold\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS emergent-behavior-monitoring.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousMaturityPolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-maturity-certification.json: expected object\n");
    return false;
  }
  if (typeof policy.minimumScore !== "number" || policy.minimumScore < 0 || policy.minimumScore > 1) {
    process.stderr.write("[governance-check] FAIL autonomous-maturity-certification.json: invalid minimumScore\n");
    hasFailure = true;
  }
  if (!isObject(policy.dimensionWeights)) {
    process.stderr.write("[governance-check] FAIL autonomous-maturity-certification.json: invalid dimensionWeights\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-maturity-certification.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateOrganismModePolicy(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL organism-mode-v1.json: expected object\n");
    return false;
  }
  if (typeof policy.requireMaturityCertification !== "boolean") {
    process.stderr.write("[governance-check] FAIL organism-mode-v1.json: invalid requireMaturityCertification\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.blockedActionLimits)) {
    process.stderr.write("[governance-check] FAIL organism-mode-v1.json: invalid blockedActionLimits\n");
    hasFailure = true;
  }
  if (typeof policy.requiredBriefingPath !== "string" || policy.requiredBriefingPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL organism-mode-v1.json: invalid requiredBriefingPath\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS organism-mode-v1.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomyPolicyCompiler(policy) {
  let hasFailure = false;
  const allowedEffects = new Set(["allow", "deny", "require_approval"]);

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomy-policy-compiler.json: expected object\n");
    return false;
  }
  if (typeof policy.version !== "string" || policy.version.trim() === "") {
    process.stderr.write("[governance-check] FAIL autonomy-policy-compiler.json: invalid version\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.allowedEffects) ||
    policy.allowedEffects.length === 0 ||
    policy.allowedEffects.some((effect) => typeof effect !== "string" || !allowedEffects.has(effect))
  ) {
    process.stderr.write("[governance-check] FAIL autonomy-policy-compiler.json: invalid allowedEffects\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredFields) ||
    policy.requiredFields.length === 0 ||
    policy.requiredFields.some((field) => typeof field !== "string" || field.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL autonomy-policy-compiler.json: invalid requiredFields\n");
    hasFailure = true;
  }
  if (typeof policy.defaultEffect !== "string" || !allowedEffects.has(policy.defaultEffect)) {
    process.stderr.write("[governance-check] FAIL autonomy-policy-compiler.json: invalid defaultEffect\n");
    hasFailure = true;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL autonomy-policy-compiler.json: invalid outputPath\n");
    hasFailure = true;
  }

  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomy-policy-compiler.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomyPolicies(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedEffects = new Set(["allow", "deny", "require_approval"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, scope, effect, priority, conditions } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof scope !== "string" || scope.trim() === "") {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: row ${index} missing scope\n`);
      hasFailure = true;
    }
    if (typeof effect !== "string" || !allowedEffects.has(effect)) {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: row ${index} invalid effect\n`);
      hasFailure = true;
    }
    if (!Number.isInteger(priority)) {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: row ${index} invalid priority\n`);
      hasFailure = true;
    }
    if (!isObject(conditions)) {
      process.stderr.write(`[governance-check] FAIL autonomy-policies.json: row ${index} invalid conditions\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS autonomy-policies.json: ${rows.length} policies\n`);
  }
  return !hasFailure;
}

function validateUnifiedConstraintSolverPolicy(policy) {
  let hasFailure = false;
  const allowedEffects = new Set(["allow", "deny", "require_approval"]);

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL unified-constraint-solver.json: expected object\n");
    return false;
  }
  if (
    !Array.isArray(policy.effectOrder) ||
    policy.effectOrder.length === 0 ||
    policy.effectOrder.some((effect) => typeof effect !== "string" || !allowedEffects.has(effect))
  ) {
    process.stderr.write("[governance-check] FAIL unified-constraint-solver.json: invalid effectOrder\n");
    hasFailure = true;
  }
  if (typeof policy.globalScopeKey !== "string" || policy.globalScopeKey.trim() === "") {
    process.stderr.write("[governance-check] FAIL unified-constraint-solver.json: invalid globalScopeKey\n");
    hasFailure = true;
  }
  if (typeof policy.emitTrace !== "boolean") {
    process.stderr.write("[governance-check] FAIL unified-constraint-solver.json: invalid emitTrace\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxTraceRules) || policy.maxTraceRules <= 0) {
    process.stderr.write("[governance-check] FAIL unified-constraint-solver.json: invalid maxTraceRules\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS unified-constraint-solver.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateStrategicIntentContract(policy) {
  let hasFailure = false;
  const allowedHorizons = new Set(["immediate", "quarter", "annual"]);

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL strategic-intent-contract.json: expected object\n");
    return false;
  }
  if (
    !Array.isArray(policy.requiredFields) ||
    policy.requiredFields.length === 0 ||
    policy.requiredFields.some((field) => typeof field !== "string" || field.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL strategic-intent-contract.json: invalid requiredFields\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.allowedHorizons) ||
    policy.allowedHorizons.length === 0 ||
    policy.allowedHorizons.some((horizon) => typeof horizon !== "string" || !allowedHorizons.has(horizon))
  ) {
    process.stderr.write("[governance-check] FAIL strategic-intent-contract.json: invalid allowedHorizons\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxObjectives) || policy.maxObjectives <= 0) {
    process.stderr.write("[governance-check] FAIL strategic-intent-contract.json: invalid maxObjectives\n");
    hasFailure = true;
  }
  if (typeof policy.requirePolicyReference !== "boolean") {
    process.stderr.write("[governance-check] FAIL strategic-intent-contract.json: invalid requirePolicyReference\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS strategic-intent-contract.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCrossLoopPriorityArbiter(policy) {
  let hasFailure = false;

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL cross-loop-priority-arbiter.json: expected object\n");
    return false;
  }
  if (!isObject(policy.loopWeights) || Object.keys(policy.loopWeights).length === 0) {
    process.stderr.write("[governance-check] FAIL cross-loop-priority-arbiter.json: invalid loopWeights\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxSelected) || policy.maxSelected <= 0) {
    process.stderr.write("[governance-check] FAIL cross-loop-priority-arbiter.json: invalid maxSelected\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.blockedDecisions) ||
    policy.blockedDecisions.some((decision) => !["allow", "deny", "require_approval"].includes(decision))
  ) {
    process.stderr.write("[governance-check] FAIL cross-loop-priority-arbiter.json: invalid blockedDecisions\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS cross-loop-priority-arbiter.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomyBlastRadiusGuardrails(policy) {
  let hasFailure = false;

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomy-blast-radius-guardrails.json: expected object\n");
    return false;
  }
  if (typeof policy.maxRiskScore !== "number" || policy.maxRiskScore < 0 || policy.maxRiskScore > 1) {
    process.stderr.write("[governance-check] FAIL autonomy-blast-radius-guardrails.json: invalid maxRiskScore\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxAffectedDomains) || policy.maxAffectedDomains <= 0) {
    process.stderr.write("[governance-check] FAIL autonomy-blast-radius-guardrails.json: invalid maxAffectedDomains\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxAffectedUsers) || policy.maxAffectedUsers < 0) {
    process.stderr.write("[governance-check] FAIL autonomy-blast-radius-guardrails.json: invalid maxAffectedUsers\n");
    hasFailure = true;
  }
  if (
    typeof policy.requireApprovalAboveRisk !== "number" ||
    policy.requireApprovalAboveRisk < 0 ||
    policy.requireApprovalAboveRisk > 1
  ) {
    process.stderr.write(
      "[governance-check] FAIL autonomy-blast-radius-guardrails.json: invalid requireApprovalAboveRisk\n"
    );
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomy-blast-radius-guardrails.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateTemporalPolicyWindows(policy) {
  let hasFailure = false;
  const allowedDecisions = new Set(["allow", "deny", "require_approval"]);

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL temporal-policy-windows.json: expected object\n");
    return false;
  }
  if (typeof policy.timezone !== "string" || policy.timezone.trim() === "") {
    process.stderr.write("[governance-check] FAIL temporal-policy-windows.json: invalid timezone\n");
    hasFailure = true;
  }
  if (typeof policy.defaultDecision !== "string" || !allowedDecisions.has(policy.defaultDecision)) {
    process.stderr.write("[governance-check] FAIL temporal-policy-windows.json: invalid defaultDecision\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.windows)) {
    process.stderr.write("[governance-check] FAIL temporal-policy-windows.json: invalid windows\n");
    hasFailure = true;
  } else {
    for (const [index, window] of policy.windows.entries()) {
      if (!isObject(window)) {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid\n`);
        hasFailure = true;
        continue;
      }
      if (typeof window.id !== "string" || window.id.trim() === "") {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid id\n`);
        hasFailure = true;
      }
      if (typeof window.domain !== "string" || window.domain.trim() === "") {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid domain\n`);
        hasFailure = true;
      }
      if (!Array.isArray(window.days) || window.days.length === 0) {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid days\n`);
        hasFailure = true;
      }
      if (!Number.isInteger(window.startHour) || window.startHour < 0 || window.startHour > 23) {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid startHour\n`);
        hasFailure = true;
      }
      if (!Number.isInteger(window.endHour) || window.endHour < 1 || window.endHour > 24) {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid endHour\n`);
        hasFailure = true;
      }
      if (typeof window.decision !== "string" || !allowedDecisions.has(window.decision)) {
        process.stderr.write(`[governance-check] FAIL temporal-policy-windows.json: window ${index} invalid decision\n`);
        hasFailure = true;
      }
    }
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS temporal-policy-windows.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validatePolicyExplainability(policy) {
  let hasFailure = false;

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL policy-explainability.json: expected object\n");
    return false;
  }
  if (typeof policy.includeTrace !== "boolean") {
    process.stderr.write("[governance-check] FAIL policy-explainability.json: invalid includeTrace\n");
    hasFailure = true;
  }
  if (typeof policy.includeInputs !== "boolean") {
    process.stderr.write("[governance-check] FAIL policy-explainability.json: invalid includeInputs\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxTraceItems) || policy.maxTraceItems <= 0) {
    process.stderr.write("[governance-check] FAIL policy-explainability.json: invalid maxTraceItems\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredSections) ||
    policy.requiredSections.length === 0 ||
    policy.requiredSections.some((section) => typeof section !== "string" || section.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL policy-explainability.json: invalid requiredSections\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS policy-explainability.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomyChangeBudgeting(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomy-change-budgeting.json: expected object\n");
    return false;
  }
  if (typeof policy.period !== "string" || !["daily", "weekly", "monthly"].includes(policy.period)) {
    process.stderr.write("[governance-check] FAIL autonomy-change-budgeting.json: invalid period\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.budgets) || policy.budgets.length === 0) {
    process.stderr.write("[governance-check] FAIL autonomy-change-budgeting.json: invalid budgets\n");
    hasFailure = true;
  } else {
    for (const [index, row] of policy.budgets.entries()) {
      if (!isObject(row)) {
        process.stderr.write(`[governance-check] FAIL autonomy-change-budgeting.json: row ${index} invalid\n`);
        hasFailure = true;
        continue;
      }
      if (typeof row.changeClass !== "string" || row.changeClass.trim() === "") {
        process.stderr.write(`[governance-check] FAIL autonomy-change-budgeting.json: row ${index} invalid changeClass\n`);
        hasFailure = true;
      }
      if (!Number.isInteger(row.maxUnits) || row.maxUnits <= 0) {
        process.stderr.write(`[governance-check] FAIL autonomy-change-budgeting.json: row ${index} invalid maxUnits\n`);
        hasFailure = true;
      }
    }
  }
  if (typeof policy.warnAtRatio !== "number" || policy.warnAtRatio < 0 || policy.warnAtRatio > 1) {
    process.stderr.write("[governance-check] FAIL autonomy-change-budgeting.json: invalid warnAtRatio\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomy-change-budgeting.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateGlobalRollbackOrchestrator(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL global-rollback-orchestrator.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.defaultOrder) || policy.defaultOrder.length === 0) {
    process.stderr.write("[governance-check] FAIL global-rollback-orchestrator.json: invalid defaultOrder\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxRollbackSteps) || policy.maxRollbackSteps <= 0) {
    process.stderr.write("[governance-check] FAIL global-rollback-orchestrator.json: invalid maxRollbackSteps\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requireApprovalForClasses)) {
    process.stderr.write("[governance-check] FAIL global-rollback-orchestrator.json: invalid requireApprovalForClasses\n");
    hasFailure = true;
  }
  if (typeof policy.safeModeOnRollback !== "boolean") {
    process.stderr.write("[governance-check] FAIL global-rollback-orchestrator.json: invalid safeModeOnRollback\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS global-rollback-orchestrator.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomyControlPlaneV3(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomy-control-plane-v3.json: expected object\n");
    return false;
  }
  if (
    !Array.isArray(policy.requiredChecks) ||
    policy.requiredChecks.length === 0 ||
    policy.requiredChecks.some((check) => typeof check !== "string" || check.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL autonomy-control-plane-v3.json: invalid requiredChecks\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.blockOn) ||
    policy.blockOn.length === 0 ||
    policy.blockOn.some((signal) => typeof signal !== "string" || signal.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL autonomy-control-plane-v3.json: invalid blockOn\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxRecommendedActions) || policy.maxRecommendedActions <= 0) {
    process.stderr.write("[governance-check] FAIL autonomy-control-plane-v3.json: invalid maxRecommendedActions\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomy-control-plane-v3.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateContinuousRedTeamSimulator(policy) {
  let hasFailure = false;
  const allowedSeverities = new Set(["low", "medium", "high", "critical"]);

  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL continuous-red-team-simulator.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxScenariosPerRun) || policy.maxScenariosPerRun <= 0) {
    process.stderr.write("[governance-check] FAIL continuous-red-team-simulator.json: invalid maxScenariosPerRun\n");
    hasFailure = true;
  }
  if (typeof policy.severityThreshold !== "string" || !allowedSeverities.has(policy.severityThreshold)) {
    process.stderr.write("[governance-check] FAIL continuous-red-team-simulator.json: invalid severityThreshold\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.scenarioCatalog) || policy.scenarioCatalog.length === 0) {
    process.stderr.write("[governance-check] FAIL continuous-red-team-simulator.json: invalid scenarioCatalog\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.autoBlockSeverities) ||
    policy.autoBlockSeverities.some((severity) => typeof severity !== "string" || !allowedSeverities.has(severity))
  ) {
    process.stderr.write("[governance-check] FAIL continuous-red-team-simulator.json: invalid autoBlockSeverities\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS continuous-red-team-simulator.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateSyntheticIncidentReplayGrid(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL synthetic-incident-replay-grid.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxReplaysPerRun) || policy.maxReplaysPerRun <= 0) {
    process.stderr.write("[governance-check] FAIL synthetic-incident-replay-grid.json: invalid maxReplaysPerRun\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredResponseFields) ||
    policy.requiredResponseFields.length === 0 ||
    policy.requiredResponseFields.some((field) => typeof field !== "string" || field.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL synthetic-incident-replay-grid.json: invalid requiredResponseFields\n");
    hasFailure = true;
  }
  if (typeof policy.passThreshold !== "number" || policy.passThreshold < 0 || policy.passThreshold > 1) {
    process.stderr.write("[governance-check] FAIL synthetic-incident-replay-grid.json: invalid passThreshold\n");
    hasFailure = true;
  }
  if (!isObject(policy.severityWeights)) {
    process.stderr.write("[governance-check] FAIL synthetic-incident-replay-grid.json: invalid severityWeights\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS synthetic-incident-replay-grid.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateDeceptionManipulationDetection(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL deception-manipulation-detection.json: expected object\n");
    return false;
  }
  if (typeof policy.riskThreshold !== "number" || policy.riskThreshold < 0 || policy.riskThreshold > 1) {
    process.stderr.write("[governance-check] FAIL deception-manipulation-detection.json: invalid riskThreshold\n");
    hasFailure = true;
  }
  if (!isObject(policy.weightedSignals) || Object.keys(policy.weightedSignals).length === 0) {
    process.stderr.write("[governance-check] FAIL deception-manipulation-detection.json: invalid weightedSignals\n");
    hasFailure = true;
  }
  if (typeof policy.autoEscalateAbove !== "number" || policy.autoEscalateAbove < 0 || policy.autoEscalateAbove > 1) {
    process.stderr.write("[governance-check] FAIL deception-manipulation-detection.json: invalid autoEscalateAbove\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS deception-manipulation-detection.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousInsiderRiskControls(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-insider-risk-controls.json: expected object\n");
    return false;
  }
  if (typeof policy.maxRiskScore !== "number" || policy.maxRiskScore < 0 || policy.maxRiskScore > 1) {
    process.stderr.write("[governance-check] FAIL autonomous-insider-risk-controls.json: invalid maxRiskScore\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.highPrivilegeActions) || policy.highPrivilegeActions.length === 0) {
    process.stderr.write("[governance-check] FAIL autonomous-insider-risk-controls.json: invalid highPrivilegeActions\n");
    hasFailure = true;
  }
  if (
    typeof policy.requireDualApprovalAbove !== "number" ||
    policy.requireDualApprovalAbove < 0 ||
    policy.requireDualApprovalAbove > 1
  ) {
    process.stderr.write("[governance-check] FAIL autonomous-insider-risk-controls.json: invalid requireDualApprovalAbove\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxActionsPerWindow) || policy.maxActionsPerWindow <= 0) {
    process.stderr.write("[governance-check] FAIL autonomous-insider-risk-controls.json: invalid maxActionsPerWindow\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-insider-risk-controls.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateModelOutputProvenanceLedger(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL model-output-provenance-ledger.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL model-output-provenance-ledger.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredInputKinds) ||
    policy.requiredInputKinds.length === 0 ||
    policy.requiredInputKinds.some((kind) => typeof kind !== "string" || kind.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL model-output-provenance-ledger.json: invalid requiredInputKinds\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredDecisionFields) ||
    policy.requiredDecisionFields.length === 0 ||
    policy.requiredDecisionFields.some((field) => typeof field !== "string" || field.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL model-output-provenance-ledger.json: invalid requiredDecisionFields\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxEntries) || policy.maxEntries <= 0) {
    process.stderr.write("[governance-check] FAIL model-output-provenance-ledger.json: invalid maxEntries\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS model-output-provenance-ledger.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateGovernanceTamperDetection(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL governance-tamper-detection.json: expected object\n");
    return false;
  }
  if (
    !Array.isArray(policy.monitoredPaths) ||
    policy.monitoredPaths.length === 0 ||
    policy.monitoredPaths.some((monitoredPath) => typeof monitoredPath !== "string" || monitoredPath.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL governance-tamper-detection.json: invalid monitoredPaths\n");
    hasFailure = true;
  }
  if (typeof policy.snapshotPath !== "string" || policy.snapshotPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL governance-tamper-detection.json: invalid snapshotPath\n");
    hasFailure = true;
  }
  if (policy.hashAlgorithm !== "sha256") {
    process.stderr.write("[governance-check] FAIL governance-tamper-detection.json: invalid hashAlgorithm\n");
    hasFailure = true;
  }
  if (typeof policy.failOnMissing !== "boolean") {
    process.stderr.write("[governance-check] FAIL governance-tamper-detection.json: invalid failOnMissing\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS governance-tamper-detection.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousSecretsMinimization(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-secrets-minimization.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxSecretsPerTask) || policy.maxSecretsPerTask <= 0) {
    process.stderr.write("[governance-check] FAIL autonomous-secrets-minimization.json: invalid maxSecretsPerTask\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxTtlMinutes) || policy.maxTtlMinutes <= 0) {
    process.stderr.write("[governance-check] FAIL autonomous-secrets-minimization.json: invalid maxTtlMinutes\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedScopes) || policy.allowedScopes.length === 0) {
    process.stderr.write("[governance-check] FAIL autonomous-secrets-minimization.json: invalid allowedScopes\n");
    hasFailure = true;
  }
  if (typeof policy.denyWildcardScopes !== "boolean") {
    process.stderr.write("[governance-check] FAIL autonomous-secrets-minimization.json: invalid denyWildcardScopes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-secrets-minimization.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateSafetyRegressionGate(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL safety-regression-gate.json: expected object\n");
    return false;
  }
  if (!isObject(policy.thresholds) || Object.keys(policy.thresholds).length === 0) {
    process.stderr.write("[governance-check] FAIL safety-regression-gate.json: invalid thresholds\n");
    hasFailure = true;
  }
  if (typeof policy.blockOnMissingMetrics !== "boolean") {
    process.stderr.write("[governance-check] FAIL safety-regression-gate.json: invalid blockOnMissingMetrics\n");
    hasFailure = true;
  }
  if (typeof policy.reportPath !== "string" || policy.reportPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL safety-regression-gate.json: invalid reportPath\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS safety-regression-gate.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateMultiRegionFailureSovereignty(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL multi-region-failure-sovereignty.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.primaryRegions) || policy.primaryRegions.length === 0) {
    process.stderr.write("[governance-check] FAIL multi-region-failure-sovereignty.json: invalid primaryRegions\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredControlStates) || policy.requiredControlStates.length === 0) {
    process.stderr.write("[governance-check] FAIL multi-region-failure-sovereignty.json: invalid requiredControlStates\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxUnavailablePrimaries) || policy.maxUnavailablePrimaries < 0) {
    process.stderr.write("[governance-check] FAIL multi-region-failure-sovereignty.json: invalid maxUnavailablePrimaries\n");
    hasFailure = true;
  }
  if (typeof policy.degradedModeActionLimit !== "string" || !["normal", "restricted", "halted"].includes(policy.degradedModeActionLimit)) {
    process.stderr.write("[governance-check] FAIL multi-region-failure-sovereignty.json: invalid degradedModeActionLimit\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS multi-region-failure-sovereignty.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateResilienceCertificationV1(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL resilience-certification-v1.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.requiredIncidentClasses) || policy.requiredIncidentClasses.length === 0) {
    process.stderr.write("[governance-check] FAIL resilience-certification-v1.json: invalid requiredIncidentClasses\n");
    hasFailure = true;
  }
  if (typeof policy.minimumPassRate !== "number" || policy.minimumPassRate < 0 || policy.minimumPassRate > 1) {
    process.stderr.write("[governance-check] FAIL resilience-certification-v1.json: invalid minimumPassRate\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredChecks) || policy.requiredChecks.length === 0) {
    process.stderr.write("[governance-check] FAIL resilience-certification-v1.json: invalid requiredChecks\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxCriticalFindings) || policy.maxCriticalFindings < 0) {
    process.stderr.write("[governance-check] FAIL resilience-certification-v1.json: invalid maxCriticalFindings\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS resilience-certification-v1.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validatePersonalizationEthicsLayer(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL personalization-ethics-layer.json: expected object\n");
    return false;
  }
  if (typeof policy.maxPreferenceSkew !== "number" || policy.maxPreferenceSkew < 0 || policy.maxPreferenceSkew > 1) {
    process.stderr.write("[governance-check] FAIL personalization-ethics-layer.json: invalid maxPreferenceSkew\n");
    hasFailure = true;
  }
  if (
    typeof policy.minimumDiversityScore !== "number" ||
    policy.minimumDiversityScore < 0 ||
    policy.minimumDiversityScore > 1
  ) {
    process.stderr.write("[governance-check] FAIL personalization-ethics-layer.json: invalid minimumDiversityScore\n");
    hasFailure = true;
  }
  if (
    typeof policy.maxManipulationRisk !== "number" ||
    policy.maxManipulationRisk < 0 ||
    policy.maxManipulationRisk > 1
  ) {
    process.stderr.write("[governance-check] FAIL personalization-ethics-layer.json: invalid maxManipulationRisk\n");
    hasFailure = true;
  }
  if (typeof policy.blockSensitiveTargeting !== "boolean") {
    process.stderr.write("[governance-check] FAIL personalization-ethics-layer.json: invalid blockSensitiveTargeting\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.protectedAttributes) ||
    policy.protectedAttributes.length === 0 ||
    policy.protectedAttributes.some((value) => typeof value !== "string" || value.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL personalization-ethics-layer.json: invalid protectedAttributes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS personalization-ethics-layer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateUserAgencyControlsV2(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL user-agency-controls-v2.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL user-agency-controls-v2.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxProfiles) || policy.maxProfiles <= 0) {
    process.stderr.write("[governance-check] FAIL user-agency-controls-v2.json: invalid maxProfiles\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.allowedAutonomyModes) ||
    policy.allowedAutonomyModes.length === 0 ||
    policy.allowedAutonomyModes.some((value) => typeof value !== "string" || value.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL user-agency-controls-v2.json: invalid allowedAutonomyModes\n");
    hasFailure = true;
  }
  if (
    typeof policy.maxPersonalizationIntensityCap !== "number" ||
    policy.maxPersonalizationIntensityCap < 0 ||
    policy.maxPersonalizationIntensityCap > 1
  ) {
    process.stderr.write(
      "[governance-check] FAIL user-agency-controls-v2.json: invalid maxPersonalizationIntensityCap\n"
    );
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxTopicOptOuts) || policy.maxTopicOptOuts < 0) {
    process.stderr.write("[governance-check] FAIL user-agency-controls-v2.json: invalid maxTopicOptOuts\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS user-agency-controls-v2.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateIntentAwareSessionPlanner(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL intent-aware-session-planner.json: expected object\n");
    return false;
  }
  if (
    typeof policy.minimumIntentConfidence !== "number" ||
    policy.minimumIntentConfidence < 0 ||
    policy.minimumIntentConfidence > 1
  ) {
    process.stderr.write("[governance-check] FAIL intent-aware-session-planner.json: invalid minimumIntentConfidence\n");
    hasFailure = true;
  }
  if (!isObject(policy.intentModuleMap) || Object.keys(policy.intentModuleMap).length === 0) {
    process.stderr.write("[governance-check] FAIL intent-aware-session-planner.json: invalid intentModuleMap\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.fallbackSequence) || policy.fallbackSequence.length === 0) {
    process.stderr.write("[governance-check] FAIL intent-aware-session-planner.json: invalid fallbackSequence\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxHighRiskRecommendations) || policy.maxHighRiskRecommendations <= 0) {
    process.stderr.write(
      "[governance-check] FAIL intent-aware-session-planner.json: invalid maxHighRiskRecommendations\n"
    );
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS intent-aware-session-planner.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCrossFormatContinuityEngine(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL cross-format-continuity-engine.json: expected object\n");
    return false;
  }
  if (
    !Array.isArray(policy.requiredSurfaces) ||
    policy.requiredSurfaces.length === 0 ||
    policy.requiredSurfaces.some((value) => typeof value !== "string" || value.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL cross-format-continuity-engine.json: invalid requiredSurfaces\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredContextKeys) ||
    policy.requiredContextKeys.length === 0 ||
    policy.requiredContextKeys.some((value) => typeof value !== "string" || value.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL cross-format-continuity-engine.json: invalid requiredContextKeys\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxIdleMinutes) || policy.maxIdleMinutes <= 0) {
    process.stderr.write("[governance-check] FAIL cross-format-continuity-engine.json: invalid maxIdleMinutes\n");
    hasFailure = true;
  }
  if (typeof policy.allowPartialContinuityAboveRisk !== "boolean") {
    process.stderr.write(
      "[governance-check] FAIL cross-format-continuity-engine.json: invalid allowPartialContinuityAboveRisk\n"
    );
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS cross-format-continuity-engine.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateNarrativeCoherenceScorer(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL narrative-coherence-scorer.json: expected object\n");
    return false;
  }
  if (typeof policy.minimumCoherenceScore !== "number" || policy.minimumCoherenceScore < 0 || policy.minimumCoherenceScore > 1) {
    process.stderr.write("[governance-check] FAIL narrative-coherence-scorer.json: invalid minimumCoherenceScore\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxSequenceJump) || policy.maxSequenceJump < 0) {
    process.stderr.write("[governance-check] FAIL narrative-coherence-scorer.json: invalid maxSequenceJump\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredContextLinks) ||
    policy.requiredContextLinks.length === 0 ||
    policy.requiredContextLinks.some((value) => typeof value !== "string" || value.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL narrative-coherence-scorer.json: invalid requiredContextLinks\n");
    hasFailure = true;
  }
  if (typeof policy.blockOnMissingCoreLink !== "boolean") {
    process.stderr.write("[governance-check] FAIL narrative-coherence-scorer.json: invalid blockOnMissingCoreLink\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS narrative-coherence-scorer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateContextualModerationEscalation(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL contextual-moderation-escalation.json: expected object\n");
    return false;
  }
  if (typeof policy.baseSeverityThreshold !== "number" || policy.baseSeverityThreshold < 0 || policy.baseSeverityThreshold > 1) {
    process.stderr.write("[governance-check] FAIL contextual-moderation-escalation.json: invalid baseSeverityThreshold\n");
    hasFailure = true;
  }
  if (!isObject(policy.contextAmplifiers)) {
    process.stderr.write("[governance-check] FAIL contextual-moderation-escalation.json: invalid contextAmplifiers\n");
    hasFailure = true;
  }
  if (typeof policy.escalateAbove !== "number" || policy.escalateAbove < 0 || policy.escalateAbove > 1) {
    process.stderr.write("[governance-check] FAIL contextual-moderation-escalation.json: invalid escalateAbove\n");
    hasFailure = true;
  }
  if (typeof policy.hardBlockAbove !== "number" || policy.hardBlockAbove < 0 || policy.hardBlockAbove > 1) {
    process.stderr.write("[governance-check] FAIL contextual-moderation-escalation.json: invalid hardBlockAbove\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS contextual-moderation-escalation.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAdaptiveFrictionSystem(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL adaptive-friction-system.json: expected object\n");
    return false;
  }
  if (typeof policy.lowRiskMax !== "number" || policy.lowRiskMax < 0 || policy.lowRiskMax > 1) {
    process.stderr.write("[governance-check] FAIL adaptive-friction-system.json: invalid lowRiskMax\n");
    hasFailure = true;
  }
  if (typeof policy.mediumRiskMax !== "number" || policy.mediumRiskMax < 0 || policy.mediumRiskMax > 1) {
    process.stderr.write("[governance-check] FAIL adaptive-friction-system.json: invalid mediumRiskMax\n");
    hasFailure = true;
  }
  if (!isObject(policy.frictionByTier)) {
    process.stderr.write("[governance-check] FAIL adaptive-friction-system.json: invalid frictionByTier\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxInterventionsPerSession) || policy.maxInterventionsPerSession <= 0) {
    process.stderr.write("[governance-check] FAIL adaptive-friction-system.json: invalid maxInterventionsPerSession\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS adaptive-friction-system.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateTrustPreservingGrowthEngine(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL trust-preserving-growth-engine.json: expected object\n");
    return false;
  }
  if (typeof policy.maxTrustRisk !== "number" || policy.maxTrustRisk < 0 || policy.maxTrustRisk > 1) {
    process.stderr.write("[governance-check] FAIL trust-preserving-growth-engine.json: invalid maxTrustRisk\n");
    hasFailure = true;
  }
  if (typeof policy.maxSafetyRisk !== "number" || policy.maxSafetyRisk < 0 || policy.maxSafetyRisk > 1) {
    process.stderr.write("[governance-check] FAIL trust-preserving-growth-engine.json: invalid maxSafetyRisk\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredSignals) || policy.requiredSignals.length === 0) {
    process.stderr.write("[governance-check] FAIL trust-preserving-growth-engine.json: invalid requiredSignals\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.blockedActions) || policy.blockedActions.length === 0) {
    process.stderr.write("[governance-check] FAIL trust-preserving-growth-engine.json: invalid blockedActions\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS trust-preserving-growth-engine.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateEmotionalSafetySignalsV1(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL emotional-safety-signals-v1.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL emotional-safety-signals-v1.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxEntries) || policy.maxEntries <= 0) {
    process.stderr.write("[governance-check] FAIL emotional-safety-signals-v1.json: invalid maxEntries\n");
    hasFailure = true;
  }
  if (typeof policy.highSeverityThreshold !== "number" || policy.highSeverityThreshold < 0 || policy.highSeverityThreshold > 1) {
    process.stderr.write("[governance-check] FAIL emotional-safety-signals-v1.json: invalid highSeverityThreshold\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.protectedPatterns) || policy.protectedPatterns.length === 0) {
    process.stderr.write("[governance-check] FAIL emotional-safety-signals-v1.json: invalid protectedPatterns\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS emotional-safety-signals-v1.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateHumanInLoopExperienceConsole(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL human-in-the-loop-experience-console.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL human-in-the-loop-experience-console.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.highImpactActions) || policy.highImpactActions.length === 0) {
    process.stderr.write("[governance-check] FAIL human-in-the-loop-experience-console.json: invalid highImpactActions\n");
    hasFailure = true;
  }
  if (typeof policy.requireApprovalForHighImpact !== "boolean") {
    process.stderr.write(
      "[governance-check] FAIL human-in-the-loop-experience-console.json: invalid requireApprovalForHighImpact\n"
    );
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxOpenActions) || policy.maxOpenActions <= 0) {
    process.stderr.write("[governance-check] FAIL human-in-the-loop-experience-console.json: invalid maxOpenActions\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS human-in-the-loop-experience-console.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCreatorAutonomyContracts(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL creator-autonomy-contracts.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL creator-autonomy-contracts.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.defaultPermissions) || policy.defaultPermissions.length === 0) {
    process.stderr.write("[governance-check] FAIL creator-autonomy-contracts.json: invalid defaultPermissions\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.restrictedActions) || policy.restrictedActions.length === 0) {
    process.stderr.write("[governance-check] FAIL creator-autonomy-contracts.json: invalid restrictedActions\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxContracts) || policy.maxContracts <= 0) {
    process.stderr.write("[governance-check] FAIL creator-autonomy-contracts.json: invalid maxContracts\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS creator-autonomy-contracts.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateRightsAwareAgentEditingV2(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL rights-aware-agent-editing-v2.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.blockedLicenseStates) || policy.blockedLicenseStates.length === 0) {
    process.stderr.write("[governance-check] FAIL rights-aware-agent-editing-v2.json: invalid blockedLicenseStates\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredRights) || policy.requiredRights.length === 0) {
    process.stderr.write("[governance-check] FAIL rights-aware-agent-editing-v2.json: invalid requiredRights\n");
    hasFailure = true;
  }
  if (typeof policy.requireAttribution !== "boolean") {
    process.stderr.write("[governance-check] FAIL rights-aware-agent-editing-v2.json: invalid requireAttribution\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxPendingClaims) || policy.maxPendingClaims < 0) {
    process.stderr.write("[governance-check] FAIL rights-aware-agent-editing-v2.json: invalid maxPendingClaims\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS rights-aware-agent-editing-v2.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCreatorAiRevenueShareEngine(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL creator-ai-revenue-share-engine.json: expected object\n");
    return false;
  }
  if (typeof policy.minimumCreatorShare !== "number" || policy.minimumCreatorShare < 0 || policy.minimumCreatorShare > 1) {
    process.stderr.write("[governance-check] FAIL creator-ai-revenue-share-engine.json: invalid minimumCreatorShare\n");
    hasFailure = true;
  }
  if (typeof policy.maximumAgentShare !== "number" || policy.maximumAgentShare < 0 || policy.maximumAgentShare > 1) {
    process.stderr.write("[governance-check] FAIL creator-ai-revenue-share-engine.json: invalid maximumAgentShare\n");
    hasFailure = true;
  }
  if (typeof policy.platformShare !== "number" || policy.platformShare < 0 || policy.platformShare > 1) {
    process.stderr.write("[governance-check] FAIL creator-ai-revenue-share-engine.json: invalid platformShare\n");
    hasFailure = true;
  }
  if (typeof policy.requireAttributionWeights !== "boolean") {
    process.stderr.write("[governance-check] FAIL creator-ai-revenue-share-engine.json: invalid requireAttributionWeights\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS creator-ai-revenue-share-engine.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAttributionGraphV2(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL attribution-graph-v2.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL attribution-graph-v2.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxEdges) || policy.maxEdges <= 0) {
    process.stderr.write("[governance-check] FAIL attribution-graph-v2.json: invalid maxEdges\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedEdgeTypes) || policy.allowedEdgeTypes.length === 0) {
    process.stderr.write("[governance-check] FAIL attribution-graph-v2.json: invalid allowedEdgeTypes\n");
    hasFailure = true;
  }
  if (typeof policy.requireEvidenceRef !== "boolean") {
    process.stderr.write("[governance-check] FAIL attribution-graph-v2.json: invalid requireEvidenceRef\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS attribution-graph-v2.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousSponsorshipCompliance(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-sponsorship-compliance.json: expected object\n");
    return false;
  }
  if (typeof policy.requireDisclosureTag !== "boolean") {
    process.stderr.write("[governance-check] FAIL autonomous-sponsorship-compliance.json: invalid requireDisclosureTag\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.requiredDisclosureMarkers) || policy.requiredDisclosureMarkers.length === 0) {
    process.stderr.write(
      "[governance-check] FAIL autonomous-sponsorship-compliance.json: invalid requiredDisclosureMarkers\n"
    );
    hasFailure = true;
  }
  if (typeof policy.blockUndeclaredSponsoredContent !== "boolean") {
    process.stderr.write(
      "[governance-check] FAIL autonomous-sponsorship-compliance.json: invalid blockUndeclaredSponsoredContent\n"
    );
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxHiddenSponsorMentions) || policy.maxHiddenSponsorMentions < 0) {
    process.stderr.write(
      "[governance-check] FAIL autonomous-sponsorship-compliance.json: invalid maxHiddenSponsorMentions\n"
    );
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-sponsorship-compliance.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateDynamicLicensingResolver(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL dynamic-licensing-resolver.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.incompatiblePairs) || policy.incompatiblePairs.length === 0) {
    process.stderr.write("[governance-check] FAIL dynamic-licensing-resolver.json: invalid incompatiblePairs\n");
    hasFailure = true;
  }
  if (typeof policy.defaultResolution !== "string" || !["allow", "deny"].includes(policy.defaultResolution)) {
    process.stderr.write("[governance-check] FAIL dynamic-licensing-resolver.json: invalid defaultResolution\n");
    hasFailure = true;
  }
  if (typeof policy.blockOnUnknownLicense !== "boolean") {
    process.stderr.write("[governance-check] FAIL dynamic-licensing-resolver.json: invalid blockOnUnknownLicense\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS dynamic-licensing-resolver.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCreatorRiskScoreV1(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL creator-risk-score-v1.json: expected object\n");
    return false;
  }
  if (!isObject(policy.weights)) {
    process.stderr.write("[governance-check] FAIL creator-risk-score-v1.json: invalid weights\n");
    hasFailure = true;
  }
  if (typeof policy.highRiskThreshold !== "number" || policy.highRiskThreshold < 0 || policy.highRiskThreshold > 1) {
    process.stderr.write("[governance-check] FAIL creator-risk-score-v1.json: invalid highRiskThreshold\n");
    hasFailure = true;
  }
  if (typeof policy.mediumRiskThreshold !== "number" || policy.mediumRiskThreshold < 0 || policy.mediumRiskThreshold > 1) {
    process.stderr.write("[governance-check] FAIL creator-risk-score-v1.json: invalid mediumRiskThreshold\n");
    hasFailure = true;
  }
  if (typeof policy.maxAutoEscalation !== "string" || !["none", "review", "throttle"].includes(policy.maxAutoEscalation)) {
    process.stderr.write("[governance-check] FAIL creator-risk-score-v1.json: invalid maxAutoEscalation\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS creator-risk-score-v1.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateReputationWeightedDistribution(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL reputation-weighted-distribution.json: expected object\n");
    return false;
  }
  if (
    typeof policy.minimumReputationForBoost !== "number" ||
    policy.minimumReputationForBoost < 0 ||
    policy.minimumReputationForBoost > 1
  ) {
    process.stderr.write(
      "[governance-check] FAIL reputation-weighted-distribution.json: invalid minimumReputationForBoost\n"
    );
    hasFailure = true;
  }
  if (
    typeof policy.throttleBelowReputation !== "number" ||
    policy.throttleBelowReputation < 0 ||
    policy.throttleBelowReputation > 1
  ) {
    process.stderr.write(
      "[governance-check] FAIL reputation-weighted-distribution.json: invalid throttleBelowReputation\n"
    );
    hasFailure = true;
  }
  if (typeof policy.maxThrottleFactor !== "number" || policy.maxThrottleFactor < 0 || policy.maxThrottleFactor > 1) {
    process.stderr.write("[governance-check] FAIL reputation-weighted-distribution.json: invalid maxThrottleFactor\n");
    hasFailure = true;
  }
  if (typeof policy.qualityWeight !== "number" || typeof policy.reputationWeight !== "number") {
    process.stderr.write(
      "[governance-check] FAIL reputation-weighted-distribution.json: invalid quality/reputation weights\n"
    );
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS reputation-weighted-distribution.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateDisputeResolutionAutomation(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL dispute-resolution-automation.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL dispute-resolution-automation.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.allowedStates) || policy.allowedStates.length === 0) {
    process.stderr.write("[governance-check] FAIL dispute-resolution-automation.json: invalid allowedStates\n");
    hasFailure = true;
  }
  if (typeof policy.initialState !== "string" || policy.initialState.trim() === "") {
    process.stderr.write("[governance-check] FAIL dispute-resolution-automation.json: invalid initialState\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxOpenDisputes) || policy.maxOpenDisputes <= 0) {
    process.stderr.write("[governance-check] FAIL dispute-resolution-automation.json: invalid maxOpenDisputes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS dispute-resolution-automation.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCreatorGovernanceCouncilApi(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL creator-governance-council-api.json: expected object\n");
    return false;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL creator-governance-council-api.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.quorum) || policy.quorum <= 0) {
    process.stderr.write("[governance-check] FAIL creator-governance-council-api.json: invalid quorum\n");
    hasFailure = true;
  }
  if (typeof policy.approvalThreshold !== "number" || policy.approvalThreshold < 0 || policy.approvalThreshold > 1) {
    process.stderr.write("[governance-check] FAIL creator-governance-council-api.json: invalid approvalThreshold\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxOpenProposals) || policy.maxOpenProposals <= 0) {
    process.stderr.write("[governance-check] FAIL creator-governance-council-api.json: invalid maxOpenProposals\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS creator-governance-council-api.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateAutonomousFinanceController(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL autonomous-finance-controller.json: expected object\n");
    return false;
  }
  if (!Number.isInteger(policy.maxActionSpendCents) || policy.maxActionSpendCents <= 0) {
    process.stderr.write("[governance-check] FAIL autonomous-finance-controller.json: invalid maxActionSpendCents\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxHourlyAutonomySpendCents) || policy.maxHourlyAutonomySpendCents <= 0) {
    process.stderr.write("[governance-check] FAIL autonomous-finance-controller.json: invalid maxHourlyAutonomySpendCents\n");
    hasFailure = true;
  }
  if (
    typeof policy.minRemainingBudgetRatio !== "number" ||
    policy.minRemainingBudgetRatio < 0 ||
    policy.minRemainingBudgetRatio > 1
  ) {
    process.stderr.write("[governance-check] FAIL autonomous-finance-controller.json: invalid minRemainingBudgetRatio\n");
    hasFailure = true;
  }
  if (typeof policy.throttleMultiplier !== "number" || policy.throttleMultiplier < 0 || policy.throttleMultiplier > 1) {
    process.stderr.write("[governance-check] FAIL autonomous-finance-controller.json: invalid throttleMultiplier\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.blockedActionTypes) ||
    policy.blockedActionTypes.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL autonomous-finance-controller.json: invalid blockedActionTypes\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS autonomous-finance-controller.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateForecastVsActualDriftEngine(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL forecast-vs-actual-drift-engine.json: expected object\n");
    return false;
  }
  if (typeof policy.driftWarningRatio !== "number" || policy.driftWarningRatio < 0) {
    process.stderr.write("[governance-check] FAIL forecast-vs-actual-drift-engine.json: invalid driftWarningRatio\n");
    hasFailure = true;
  }
  if (typeof policy.driftCriticalRatio !== "number" || policy.driftCriticalRatio < 0) {
    process.stderr.write("[governance-check] FAIL forecast-vs-actual-drift-engine.json: invalid driftCriticalRatio\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxCorrectiveActions) || policy.maxCorrectiveActions <= 0) {
    process.stderr.write("[governance-check] FAIL forecast-vs-actual-drift-engine.json: invalid maxCorrectiveActions\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.requiredActions) ||
    policy.requiredActions.length === 0 ||
    policy.requiredActions.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL forecast-vs-actual-drift-engine.json: invalid requiredActions\n");
    hasFailure = true;
  }
  if (typeof policy.outputPath !== "string" || policy.outputPath.trim() === "") {
    process.stderr.write("[governance-check] FAIL forecast-vs-actual-drift-engine.json: invalid outputPath\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS forecast-vs-actual-drift-engine.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateRoiConstrainedActionPlanner(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL roi-constrained-action-planner.json: expected object\n");
    return false;
  }
  if (typeof policy.minRoiRatio !== "number" || policy.minRoiRatio <= 0) {
    process.stderr.write("[governance-check] FAIL roi-constrained-action-planner.json: invalid minRoiRatio\n");
    hasFailure = true;
  }
  if (typeof policy.confidenceFloor !== "number" || policy.confidenceFloor < 0 || policy.confidenceFloor > 1) {
    process.stderr.write("[governance-check] FAIL roi-constrained-action-planner.json: invalid confidenceFloor\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.maxPaybackDays) || policy.maxPaybackDays <= 0) {
    process.stderr.write("[governance-check] FAIL roi-constrained-action-planner.json: invalid maxPaybackDays\n");
    hasFailure = true;
  }
  if (typeof policy.requirePositiveNetValue !== "boolean") {
    process.stderr.write("[governance-check] FAIL roi-constrained-action-planner.json: invalid requirePositiveNetValue\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS roi-constrained-action-planner.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateTokenEconomyStabilizer(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL token-economy-stabilizer.json: expected object\n");
    return false;
  }
  if (typeof policy.targetTokenBudget !== "number" || policy.targetTokenBudget <= 0) {
    process.stderr.write("[governance-check] FAIL token-economy-stabilizer.json: invalid targetTokenBudget\n");
    hasFailure = true;
  }
  if (typeof policy.controlBandMinRatio !== "number" || policy.controlBandMinRatio <= 0) {
    process.stderr.write("[governance-check] FAIL token-economy-stabilizer.json: invalid controlBandMinRatio\n");
    hasFailure = true;
  }
  if (typeof policy.controlBandMaxRatio !== "number" || policy.controlBandMaxRatio <= 0) {
    process.stderr.write("[governance-check] FAIL token-economy-stabilizer.json: invalid controlBandMaxRatio\n");
    hasFailure = true;
  }
  if (
    typeof policy.maxAutoCorrectionRatio !== "number" ||
    policy.maxAutoCorrectionRatio < 0 ||
    policy.maxAutoCorrectionRatio > 1
  ) {
    process.stderr.write("[governance-check] FAIL token-economy-stabilizer.json: invalid maxAutoCorrectionRatio\n");
    hasFailure = true;
  }
  if (
    !Array.isArray(policy.stabilizationActions) ||
    policy.stabilizationActions.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    process.stderr.write("[governance-check] FAIL token-economy-stabilizer.json: invalid stabilizationActions\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS token-economy-stabilizer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCapexOpexSplitOptimizer(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL capex-opex-split-optimizer.json: expected object\n");
    return false;
  }
  if (!Array.isArray(policy.capexPreferredWorkloads)) {
    process.stderr.write("[governance-check] FAIL capex-opex-split-optimizer.json: invalid capexPreferredWorkloads\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.opexPreferredWorkloads)) {
    process.stderr.write("[governance-check] FAIL capex-opex-split-optimizer.json: invalid opexPreferredWorkloads\n");
    hasFailure = true;
  }
  if (typeof policy.maxOpexRatio !== "number" || policy.maxOpexRatio < 0 || policy.maxOpexRatio > 1) {
    process.stderr.write("[governance-check] FAIL capex-opex-split-optimizer.json: invalid maxOpexRatio\n");
    hasFailure = true;
  }
  if (policy.fallbackMode !== "capex" && policy.fallbackMode !== "opex") {
    process.stderr.write("[governance-check] FAIL capex-opex-split-optimizer.json: invalid fallbackMode\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS capex-opex-split-optimizer.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateCarbonAwareAutonomyScheduler(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL carbon-aware-autonomy-scheduler.json: expected object\n");
    return false;
  }
  if (typeof policy.maxCarbonIntensityForImmediate !== "number" || policy.maxCarbonIntensityForImmediate < 0) {
    process.stderr.write("[governance-check] FAIL carbon-aware-autonomy-scheduler.json: invalid maxCarbonIntensityForImmediate\n");
    hasFailure = true;
  }
  if (!Array.isArray(policy.eligiblePriorities) || policy.eligiblePriorities.length === 0) {
    process.stderr.write("[governance-check] FAIL carbon-aware-autonomy-scheduler.json: invalid eligiblePriorities\n");
    hasFailure = true;
  }
  if (!Number.isInteger(policy.deferWindowMinutes) || policy.deferWindowMinutes <= 0) {
    process.stderr.write("[governance-check] FAIL carbon-aware-autonomy-scheduler.json: invalid deferWindowMinutes\n");
    hasFailure = true;
  }
  if (typeof policy.hardBlockAboveIntensity !== "number" || policy.hardBlockAboveIntensity < 0) {
    process.stderr.write("[governance-check] FAIL carbon-aware-autonomy-scheduler.json: invalid hardBlockAboveIntensity\n");
    hasFailure = true;
  }
  if (!hasFailure) {
    process.stdout.write("[governance-check] PASS carbon-aware-autonomy-scheduler.json: policy shape valid\n");
  }
  return !hasFailure;
}

function validateMarketplaceIntegrityMonitor(policy) {
  let hasFailure = false;
  if (!isObject(policy)) {
    process.stderr.write("[governance-check] FAIL marketplace-integrity-monitor.json: expected object\n");
    return false;
  }
  if (typeof policy.fraudRiskBlockThreshold !== "number") hasFailure = true;
  if (typeof policy.fraudRiskReviewThreshold !== "number") hasFailure = true;
  if (!Number.isInteger(policy.maxViolationsBeforeSuspend) || policy.maxViolationsBeforeSuspend <= 0) hasFailure = true;
  if (!Array.isArray(policy.remediationActions)) hasFailure = true;
  if (hasFailure) {
    process.stderr.write("[governance-check] FAIL marketplace-integrity-monitor.json: invalid policy shape\n");
    return false;
  }
  process.stdout.write("[governance-check] PASS marketplace-integrity-monitor.json: policy shape valid\n");
  return true;
}

function validateFraudAdaptiveRewardGuardrails(policy) {
  let hasFailure = false;
  if (!isObject(policy)) return false;
  if (typeof policy.warningFraudIndex !== "number") hasFailure = true;
  if (typeof policy.criticalFraudIndex !== "number") hasFailure = true;
  if (typeof policy.throttleFactor !== "number") hasFailure = true;
  if (typeof policy.haltWhenCritical !== "boolean") hasFailure = true;
  if (hasFailure) {
    process.stderr.write("[governance-check] FAIL fraud-adaptive-reward-guardrails.json: invalid policy shape\n");
    return false;
  }
  process.stdout.write("[governance-check] PASS fraud-adaptive-reward-guardrails.json: policy shape valid\n");
  return true;
}

function validateRevenueStressTestingSuite(policy) {
  if (!isObject(policy)) return false;
  const ok =
    typeof policy.minResilienceRatio === "number" &&
    typeof policy.breachThresholdRatio === "number" &&
    Array.isArray(policy.requiredScenarios);
  if (!ok) {
    process.stderr.write("[governance-check] FAIL revenue-stress-testing-suite.json: invalid policy shape\n");
    return false;
  }
  process.stdout.write("[governance-check] PASS revenue-stress-testing-suite.json: policy shape valid\n");
  return true;
}

function validateFinancialGovernanceCertificationV1(policy) {
  if (!isObject(policy)) return false;
  const ok =
    Array.isArray(policy.requiredChecks) &&
    typeof policy.minimumPassRatio === "number" &&
    typeof policy.evidenceOutputPath === "string";
  if (!ok) {
    process.stderr.write("[governance-check] FAIL financial-governance-certification-v1.json: invalid policy shape\n");
    return false;
  }
  process.stdout.write("[governance-check] PASS financial-governance-certification-v1.json: policy shape valid\n");
  return true;
}

function validateDsarWorkflows(rows) {
  let hasFailure = false;
  const seenTypes = new Set();
  const allowedTypes = new Set(["export", "delete"]);
  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL dsar-workflows.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }
    const { type, steps, evidencePath, slaDays } = row;
    if (typeof type !== "string" || !allowedTypes.has(type)) {
      process.stderr.write(`[governance-check] FAIL dsar-workflows.json: row ${index} invalid type '${String(type)}'\n`);
      hasFailure = true;
    } else if (seenTypes.has(type)) {
      process.stderr.write(`[governance-check] FAIL dsar-workflows.json: duplicate type '${type}'\n`);
      hasFailure = true;
    } else {
      seenTypes.add(type);
    }
    if (!Array.isArray(steps) || steps.length === 0 || steps.some((step) => typeof step !== "string" || step.trim() === "")) {
      process.stderr.write(`[governance-check] FAIL dsar-workflows.json: row ${index} invalid steps\n`);
      hasFailure = true;
    }
    if (typeof evidencePath !== "string" || evidencePath.trim() === "") {
      process.stderr.write(`[governance-check] FAIL dsar-workflows.json: row ${index} missing evidencePath\n`);
      hasFailure = true;
    }
    if (!Number.isInteger(slaDays) || slaDays <= 0) {
      process.stderr.write(`[governance-check] FAIL dsar-workflows.json: row ${index} invalid slaDays\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS dsar-workflows.json: ${rows.length} workflows\n`);
  }
  return !hasFailure;
}

function validateProductionCertification(rows) {
  let hasFailure = false;
  const ids = new Set();
  const allowedCheckKeys = new Set(["launch_blockers", "key_rotation_overdue", "supply_chain_blockers"]);

  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL production-certification.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }

    const { id, name, required, checkKey } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL production-certification.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL production-certification.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof name !== "string" || name.trim() === "") {
      process.stderr.write(`[governance-check] FAIL production-certification.json: row ${index} missing name\n`);
      hasFailure = true;
    }
    if (typeof required !== "boolean") {
      process.stderr.write(`[governance-check] FAIL production-certification.json: row ${index} required must be boolean\n`);
      hasFailure = true;
    }
    if (typeof checkKey !== "string" || !allowedCheckKeys.has(checkKey)) {
      process.stderr.write(
        `[governance-check] FAIL production-certification.json: row ${index} invalid checkKey '${String(checkKey)}'\n`
      );
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS production-certification.json: ${rows.length} rules\n`);
  }
  return !hasFailure;
}

function validateObjectives(rows) {
  let hasFailure = false;
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL objectives.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }
    const { id, scope, owner, metricKey, target } = row;
    if (typeof id !== "string" || id.trim() === "") {
      process.stderr.write(`[governance-check] FAIL objectives.json: row ${index} missing id\n`);
      hasFailure = true;
    } else if (ids.has(id)) {
      process.stderr.write(`[governance-check] FAIL objectives.json: duplicate id '${id}'\n`);
      hasFailure = true;
    } else {
      ids.add(id);
    }
    if (typeof scope !== "string" || scope.trim() === "") {
      process.stderr.write(`[governance-check] FAIL objectives.json: row ${index} missing scope\n`);
      hasFailure = true;
    }
    if (typeof owner !== "string" || owner.trim() === "") {
      process.stderr.write(`[governance-check] FAIL objectives.json: row ${index} missing owner\n`);
      hasFailure = true;
    }
    if (typeof metricKey !== "string" || metricKey.trim() === "") {
      process.stderr.write(`[governance-check] FAIL objectives.json: row ${index} missing metricKey\n`);
      hasFailure = true;
    }
    if (typeof target !== "number" || !Number.isFinite(target)) {
      process.stderr.write(`[governance-check] FAIL objectives.json: row ${index} invalid target\n`);
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS objectives.json: ${rows.length} objectives\n`);
  }
  return !hasFailure;
}

function validateRolloutGuardrails(rows) {
  let hasFailure = false;
  const metrics = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      process.stderr.write(`[governance-check] FAIL rollout-guardrails.json: row ${index} is not an object\n`);
      hasFailure = true;
      continue;
    }
    const { metricKey, maxRegressionRatio, autoRollback } = row;
    if (typeof metricKey !== "string" || metricKey.trim() === "") {
      process.stderr.write(`[governance-check] FAIL rollout-guardrails.json: row ${index} missing metricKey\n`);
      hasFailure = true;
    } else if (metrics.has(metricKey)) {
      process.stderr.write(`[governance-check] FAIL rollout-guardrails.json: duplicate metricKey '${metricKey}'\n`);
      hasFailure = true;
    } else {
      metrics.add(metricKey);
    }
    if (typeof maxRegressionRatio !== "number" || maxRegressionRatio < 0) {
      process.stderr.write(`[governance-check] FAIL rollout-guardrails.json: row ${index} invalid maxRegressionRatio\n`);
      hasFailure = true;
    }
    if (typeof autoRollback !== "boolean") {
      process.stderr.write(`[governance-check] FAIL rollout-guardrails.json: row ${index} autoRollback must be boolean\n`);
      hasFailure = true;
    }
  }
  if (!hasFailure) {
    process.stdout.write(`[governance-check] PASS rollout-guardrails.json: ${rows.length} rules\n`);
  }
  return !hasFailure;
}

for (const file of files) {
  const fullPath = path.join(governanceDir, file);
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf-8"));

    if (file === "supply-chain-policy.json") {
      const ok = validateSupplyChainPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "hypothesis-generation.json") {
      const ok = validateHypothesisGenerationPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "simulation-policy.json") {
      const ok = validateSimulationPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "micro-experiments.json") {
      const ok = validateMicroExperimentsPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "learning-consolidation.json") {
      const ok = validateLearningConsolidationPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "cross-module-coordinator.json") {
      const ok = validateCrossModuleCoordinatorPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "trust-safety-optimizer.json") {
      const ok = validateTrustSafetyOptimizerPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "cost-aware-optimizer.json") {
      const ok = validateCostAwareOptimizerPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-loop-review.json") {
      const ok = validateAutonomousLoopReviewPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "external-module-sdk.json") {
      const ok = validateExternalModuleSdkPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "federation-gateway.json") {
      const ok = validateFederationGatewayPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "creator-portability.json") {
      const ok = validateCreatorPortabilityPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "open-telemetry-bridge.json") {
      const ok = validateOpenTelemetryBridgePolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "multi-tenant-controls.json") {
      const ok = validateMultiTenantControlsPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "i18n-foundation.json") {
      const ok = validateI18nFoundationPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "edge-delivery.json") {
      const ok = validateEdgeDeliveryPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "ecosystem-certification.json") {
      const ok = validateEcosystemCertificationPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "policy-engine-v2.json") {
      const ok = validatePolicyEngineV2(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "decision-journal.json") {
      const ok = validateDecisionJournalPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "governance-drift-monitor.json") {
      const ok = validateGovernanceDriftPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "org-role-simulator.json") {
      const ok = validateOrgRoleSimulatorPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "inter-agent-conflicts.json") {
      const ok = validateInterAgentConflictsPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "executive-briefing.json") {
      const ok = validateExecutiveBriefingPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "program-portfolio-optimizer.json") {
      const ok = validateProgramPortfolioOptimizerPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-audit-prep.json") {
      const ok = validateAutonomousAuditPrepPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "trustworthy-ai-score.json") {
      const ok = validateTrustworthyAiScorePolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "governance-stress-tests.json") {
      if (!Array.isArray(parsed)) {
        failed = true;
        process.stderr.write("[governance-check] FAIL governance-stress-tests.json: expected array\n");
      } else if (!validateGovernanceStressTests(parsed)) {
        failed = true;
      }
      continue;
    }

    if (file === "ecosystem-state-model.json") {
      const ok = validateEcosystemStateModelPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "adaptive-goal-selection.json") {
      const ok = validateAdaptiveGoalSelectionPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "content-programming-director.json") {
      const ok = validateContentProgrammingDirectorPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "multi-modal-narrative.json") {
      const ok = validateMultiModalNarrativePolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "community-co-creation.json") {
      const ok = validateCommunityCoCreationPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "self-healing-behaviors.json") {
      const ok = validateSelfHealingPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "long-horizon-memory.json") {
      const ok = validateLongHorizonMemoryPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "emergent-behavior-monitoring.json") {
      const ok = validateEmergentBehaviorPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-maturity-certification.json") {
      const ok = validateAutonomousMaturityPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "organism-mode-v1.json") {
      const ok = validateOrganismModePolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomy-policy-compiler.json") {
      const ok = validateAutonomyPolicyCompiler(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "unified-constraint-solver.json") {
      const ok = validateUnifiedConstraintSolverPolicy(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "strategic-intent-contract.json") {
      const ok = validateStrategicIntentContract(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "cross-loop-priority-arbiter.json") {
      const ok = validateCrossLoopPriorityArbiter(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomy-blast-radius-guardrails.json") {
      const ok = validateAutonomyBlastRadiusGuardrails(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "temporal-policy-windows.json") {
      const ok = validateTemporalPolicyWindows(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "policy-explainability.json") {
      const ok = validatePolicyExplainability(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomy-change-budgeting.json") {
      const ok = validateAutonomyChangeBudgeting(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "global-rollback-orchestrator.json") {
      const ok = validateGlobalRollbackOrchestrator(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomy-control-plane-v3.json") {
      const ok = validateAutonomyControlPlaneV3(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "continuous-red-team-simulator.json") {
      const ok = validateContinuousRedTeamSimulator(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "synthetic-incident-replay-grid.json") {
      const ok = validateSyntheticIncidentReplayGrid(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "deception-manipulation-detection.json") {
      const ok = validateDeceptionManipulationDetection(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-insider-risk-controls.json") {
      const ok = validateAutonomousInsiderRiskControls(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "model-output-provenance-ledger.json") {
      const ok = validateModelOutputProvenanceLedger(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "governance-tamper-detection.json") {
      const ok = validateGovernanceTamperDetection(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-secrets-minimization.json") {
      const ok = validateAutonomousSecretsMinimization(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "safety-regression-gate.json") {
      const ok = validateSafetyRegressionGate(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "multi-region-failure-sovereignty.json") {
      const ok = validateMultiRegionFailureSovereignty(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "resilience-certification-v1.json") {
      const ok = validateResilienceCertificationV1(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "personalization-ethics-layer.json") {
      const ok = validatePersonalizationEthicsLayer(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "user-agency-controls-v2.json") {
      const ok = validateUserAgencyControlsV2(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "intent-aware-session-planner.json") {
      const ok = validateIntentAwareSessionPlanner(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "cross-format-continuity-engine.json") {
      const ok = validateCrossFormatContinuityEngine(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "narrative-coherence-scorer.json") {
      const ok = validateNarrativeCoherenceScorer(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "contextual-moderation-escalation.json") {
      const ok = validateContextualModerationEscalation(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "adaptive-friction-system.json") {
      const ok = validateAdaptiveFrictionSystem(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "trust-preserving-growth-engine.json") {
      const ok = validateTrustPreservingGrowthEngine(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "emotional-safety-signals-v1.json") {
      const ok = validateEmotionalSafetySignalsV1(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "human-in-the-loop-experience-console.json") {
      const ok = validateHumanInLoopExperienceConsole(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "creator-autonomy-contracts.json") {
      const ok = validateCreatorAutonomyContracts(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "rights-aware-agent-editing-v2.json") {
      const ok = validateRightsAwareAgentEditingV2(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "creator-ai-revenue-share-engine.json") {
      const ok = validateCreatorAiRevenueShareEngine(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "attribution-graph-v2.json") {
      const ok = validateAttributionGraphV2(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-sponsorship-compliance.json") {
      const ok = validateAutonomousSponsorshipCompliance(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "dynamic-licensing-resolver.json") {
      const ok = validateDynamicLicensingResolver(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "creator-risk-score-v1.json") {
      const ok = validateCreatorRiskScoreV1(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "reputation-weighted-distribution.json") {
      const ok = validateReputationWeightedDistribution(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "dispute-resolution-automation.json") {
      const ok = validateDisputeResolutionAutomation(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "creator-governance-council-api.json") {
      const ok = validateCreatorGovernanceCouncilApi(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomous-finance-controller.json") {
      const ok = validateAutonomousFinanceController(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "forecast-vs-actual-drift-engine.json") {
      const ok = validateForecastVsActualDriftEngine(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "roi-constrained-action-planner.json") {
      const ok = validateRoiConstrainedActionPlanner(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "token-economy-stabilizer.json") {
      const ok = validateTokenEconomyStabilizer(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "capex-opex-split-optimizer.json") {
      const ok = validateCapexOpexSplitOptimizer(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "carbon-aware-autonomy-scheduler.json") {
      const ok = validateCarbonAwareAutonomyScheduler(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "marketplace-integrity-monitor.json") {
      const ok = validateMarketplaceIntegrityMonitor(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "fraud-adaptive-reward-guardrails.json") {
      const ok = validateFraudAdaptiveRewardGuardrails(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "revenue-stress-testing-suite.json") {
      const ok = validateRevenueStressTestingSuite(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "financial-governance-certification-v1.json") {
      const ok = validateFinancialGovernanceCertificationV1(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (simpleObjectPolicyFiles.has(file)) {
      const ok = validateSimplePolicyObject(file, parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (!Array.isArray(parsed)) {
      failed = true;
      process.stderr.write(`[governance-check] FAIL ${file}: expected JSON array\n`);
      continue;
    }

    if (file === "domain-map.json") {
      const ok = validateDomainMap(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "capability-matrix.json") {
      const ok = validateCapabilityMatrix(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "design-tokens-v2.json") {
      const ok = validateDesignTokens(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "service-dependencies.json") {
      const ok = validateServiceDependencies(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "failure-drills.json") {
      const ok = validateFailureDrills(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "incident-automation-actions.json") {
      const ok = validateIncidentAutomationActions(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "data-retention-policies.json") {
      const ok = validateDataRetentionPolicies(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "key-rotation.json") {
      const ok = validateKeyRotationPolicies(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "rbac-baseline.json") {
      const ok = validateRbacBaseline(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "dsar-workflows.json") {
      const ok = validateDsarWorkflows(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "production-certification.json") {
      const ok = validateProductionCertification(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "objectives.json") {
      const ok = validateObjectives(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "rollout-guardrails.json") {
      const ok = validateRolloutGuardrails(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    if (file === "autonomy-policies.json") {
      const ok = validateAutonomyPolicies(parsed);
      if (!ok) {
        failed = true;
      }
      continue;
    }

    process.stdout.write(`[governance-check] PASS ${file}: ${parsed.length} entries\n`);
  } catch (error) {
    failed = true;
    process.stderr.write(`[governance-check] FAIL ${file}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

if (failed) {
  process.exit(1);
}
