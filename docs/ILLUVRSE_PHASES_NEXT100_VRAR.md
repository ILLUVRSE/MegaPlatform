# ILLUVRSE MegaPlatform: XR/Animation Extended Phases (201-300)

This file defines VR/AR and animation-focused executable phases for Codex CLI from **201 through 300**.
Use it after `docs/ILLUVRSE_PHASES_NEXT100.md` Phase 200.

## How to run with Codex CLI

Use exact prompts like:
- `implement phase 201 from docs/ILLUVRSE_PHASES_NEXT100_VRAR.md`
- `implement phase 236 with tests and docs updates`
- `continue phase 278`
- `phase 300 review`

Execution contract for each phase:
1. Implement only the current phase scope.
2. Run relevant checks (`shipcheck:quick` minimum).
3. Update docs/runbooks affected by changes.
4. Commit with message: `phase-<id>: <short-title>`.
5. If blocked, create a blocker note in `docs/queue/blocked` and continue to the next unblocked phase.

## Phase Tracks

- Track S (201-210): Spatial platform foundations
- Track T (211-220): Interaction and presence systems
- Track U (221-230): Animation runtime core
- Track V (231-240): Character performance and mocap
- Track W (241-250): Worldbuilding and spatial storytelling
- Track X (251-260): Creator tooling for XR and animation
- Track Y (261-270): Live XR events and social animation
- Track Z (271-280): XR rendering and performance hardening
- Track AA (281-290): XR trust, safety, accessibility, compliance
- Track AB (291-300): XR economy, distribution, certification

## Phases

### Track S: Spatial Platform Foundations (201-210)

**Phase 201: OpenXR/WebXR Contract v1**
- Goal: unify VR/AR runtime interfaces behind one XR contract.
- Done when: shared XR contract, adapters, and validation are used by core XR routes.

**Phase 202: Device Capability Matrix XR**
- Goal: define capability support by headset/device class.
- Done when: capability matrix drives runtime feature gating and fallback behavior.

**Phase 203: Spatial Identity Anchors**
- Goal: persist user/avatar spatial anchors across sessions.
- Done when: anchors restore reliably with deterministic identity-to-anchor mapping.

**Phase 204: Scene Graph Contract v1**
- Goal: standardize node ownership, lifecycle, and mutation semantics.
- Done when: shared scene-graph contract guards invalid state transitions.

**Phase 205: Spatial Asset Streaming**
- Goal: enable progressive loading for world and animation assets.
- Done when: streaming pipeline supports incremental hydration and bounded memory.

**Phase 206: World Origin and Relocalization**
- Goal: keep spatial alignment stable under tracking drift and reconnects.
- Done when: relocalization preserves user/world continuity with tested recovery paths.

**Phase 207: Input Abstraction Layer XR**
- Goal: unify controller, hand, gaze, and voice input intents.
- Done when: interactions consume one normalized input API with device adapters.

**Phase 208: Spatial Telemetry Taxonomy v1**
- Goal: standardize XR session/motion/interaction events.
- Done when: shared schemas and helpers are adopted by at least 3 XR modules.

**Phase 209: XR Config Contract Enforcement**
- Goal: centralize XR config validation and environment constraints.
- Done when: invalid XR config fails fast with actionable startup/runtime errors.

**Phase 210: Spatial Boundary Linting**
- Goal: enforce architecture boundaries across XR packages/apps.
- Done when: boundary checks block forbidden XR cross-module coupling.

### Track T: Interaction and Presence Systems (211-220)

**Phase 211: Gesture Intent Runtime v1**
- Goal: map low-level hand/controller signals to stable intents.
- Done when: core gestures are deterministic and shared across interaction surfaces.

**Phase 212: Gaze and Attention Model**
- Goal: establish canonical gaze/attention semantics for XR UX and ranking hooks.
- Done when: gaze context is exposed through shared helpers with policy controls.

**Phase 213: Voice Command Layer XR**
- Goal: add validated hands-free command routing for immersive workflows.
- Done when: command schema, parser, and action router are productionized.

**Phase 214: Haptics Orchestration v1**
- Goal: normalize haptic feedback patterns across supported hardware.
- Done when: reusable haptic profiles are mapped by capability and runtime context.

**Phase 215: Spatial UI Grammar**
- Goal: define consistent 3D UI layout, depth, focus, and affordance rules.
- Done when: primary XR surfaces use shared spatial UI primitives and tokens.

**Phase 216: Comfort Locomotion Suite**
- Goal: support comfort-safe movement modes in VR.
- Done when: teleport/snap-turn/vignette policies are selectable and enforced.

**Phase 217: Co-Presence Core v1**
- Goal: synchronize participant presence state in shared immersive sessions.
- Done when: pose/state sync is stable with reconnect and conflict resolution behavior.

**Phase 218: Party Rooms XR**
- Goal: extend party experiences into immersive shared rooms.
- Done when: room join, voice, playlist, and host controls work in XR flow.

**Phase 219: Networked Object Sync v1**
- Goal: synchronize interactive objects across participants in real time.
- Done when: authority model and object conflict policies are deterministic and tested.

**Phase 220: Presence Reliability SLOs**
- Goal: define measurable presence reliability objectives.
- Done when: XR presence SLOs, breach metrics, and alert surfaces are live.

### Track U: Animation Runtime Core (221-230)

**Phase 221: Animation Data Model v1**
- Goal: unify animation metadata and lifecycle contract.
- Done when: clip/state schemas are centralized and validated at ingestion.

**Phase 222: Rig Contract Standardization**
- Goal: define rig compatibility constraints for animation portability.
- Done when: rig validator blocks incompatible skeleton/constraint combinations.

**Phase 223: Retargeting Engine v1**
- Goal: retarget motions across supported rig families.
- Done when: retarget pipeline outputs consistent motion with quality checks.

**Phase 224: Blend Tree Runtime v1**
- Goal: support composable animation state blending.
- Done when: shared blend tree runtime drives at least 2 character classes.

**Phase 225: IK/FK Solver Service**
- Goal: provide robust IK/FK for interaction and locomotion.
- Done when: solver service is reusable with deterministic fallback behavior.

**Phase 226: Secondary Motion Physics**
- Goal: add controlled secondary motion for higher animation fidelity.
- Done when: secondary motion layers run within defined performance budgets.

**Phase 227: Facial Animation Baseline**
- Goal: standardize facial expression control primitives.
- Done when: baseline expression set maps to reusable facial runtime controllers.

**Phase 228: Lip-Sync and Viseme Runtime**
- Goal: align speech with facial animation in real time and render paths.
- Done when: viseme timeline integration is stable and test-covered.

**Phase 229: Animation Event Timeline**
- Goal: formalize animation-driven event hooks and ordering.
- Done when: timeline events are deterministic and consumed by gameplay/UX actions.

**Phase 230: Animation Quality Gate v1**
- Goal: prevent low-quality animation regressions before publish.
- Done when: animation QA gate enforces thresholds on publish and CI checks.

### Track V: Character Performance and Mocap (231-240)

**Phase 231: Mocap Ingestion Pipeline v1**
- Goal: ingest motion capture data into canonical animation assets.
- Done when: mocap import validates, transforms, and stores deterministic outputs.

**Phase 232: Live Mocap Streaming Runtime**
- Goal: support low-latency streamed performance data.
- Done when: live stream path feeds character runtime with bounded lag behavior.

**Phase 233: Markerless Capture Integration**
- Goal: integrate markerless capture signals into animation pipelines.
- Done when: markerless inputs are normalized and pass quality thresholds.

**Phase 234: Mocap Cleanup and Smoothing Toolkit**
- Goal: reduce jitter/noise in captured performances.
- Done when: cleanup operators are reusable and measurable via quality diagnostics.

**Phase 235: Performance-to-Rig Mapping Layer**
- Goal: map performer data to runtime rigs safely.
- Done when: mapping constraints and fallback behavior are validated by test fixtures.

**Phase 236: Crowd Animation System v1**
- Goal: support scalable multi-character animation orchestration.
- Done when: crowd animation runtime handles density targets within frame budgets.

**Phase 237: Procedural Locomotion Runtime**
- Goal: generate adaptive locomotion for dynamic environments.
- Done when: procedural locomotion integrates with IK and collision constraints.

**Phase 238: Emotion-to-Animation Controller**
- Goal: map emotion state to body/facial animation parameters.
- Done when: controller produces coherent transitions and policy-bounded intensity.

**Phase 239: Character State Machine v2**
- Goal: formalize character behavior states across interaction modes.
- Done when: state machine contract is shared and invalid transitions are blocked.

**Phase 240: Character Performance SLOs**
- Goal: define reliability and quality SLOs for character performance systems.
- Done when: SLO dashboard and breach reporting are integrated for character runtime.

### Track W: Worldbuilding and Spatial Storytelling (241-250)

**Phase 241: World Authoring Contract v1**
- Goal: standardize world assembly and metadata rules.
- Done when: world authoring contract validates scene composition and ownership.

**Phase 242: Terrain and Scale Governance**
- Goal: enforce consistent terrain and world-scale semantics.
- Done when: scale/terrain validators catch out-of-policy world authoring changes.

**Phase 243: XR Lighting Pipeline**
- Goal: optimize dynamic and baked lighting for immersive scenes.
- Done when: lighting pipeline supports quality tiers tied to device capabilities.

**Phase 244: Spatial Audio Runtime v1**
- Goal: deliver directional and distance-aware audio in XR spaces.
- Done when: shared spatial audio runtime is used by core immersive experiences.

**Phase 245: Volumetric Effects Framework**
- Goal: support atmospheric and volumetric scene effects with guardrails.
- Done when: effects framework exposes reusable presets with performance caps.

**Phase 246: Cinematic Camera Rig System**
- Goal: define cinematic camera behaviors for immersive storytelling.
- Done when: camera rig primitives are reusable across scene and cutscene pipelines.

**Phase 247: Cutscene Sequencer v1**
- Goal: orchestrate timeline-driven story/camera/animation events.
- Done when: sequencer authoring and playback are deterministic and versioned.

**Phase 248: Story Beat Orchestrator**
- Goal: coordinate interactive narrative beats across XR sessions.
- Done when: beat transitions are policy-driven and recoverable after interruption.

**Phase 249: Environmental Storytelling Agent Hooks**
- Goal: let autonomous systems modify narrative world context safely.
- Done when: agent hooks are constrained by world/story safety guardrails.

**Phase 250: World Coherence Validator**
- Goal: detect narrative, spatial, and visual coherence issues.
- Done when: coherence validator emits actionable diagnostics in publish gates.

### Track X: Creator Tooling for XR and Animation (251-260)

**Phase 251: XR Creator Workspace v1**
- Goal: provide a unified XR creator workspace.
- Done when: creators can assemble, preview, and validate XR scenes in one flow.

**Phase 252: Node-Based Animation Graph Editor**
- Goal: enable visual authoring of animation state graphs.
- Done when: graph editor serializes to shared runtime blend/state contracts.

**Phase 253: Spatial Template Marketplace**
- Goal: distribute reusable immersive templates for creators.
- Done when: template publish/version/reuse lifecycle is operational.

**Phase 254: Asset Kitbashing Toolchain**
- Goal: support modular composition of environment/prop assets.
- Done when: kitbashing pipeline preserves provenance and compatibility constraints.

**Phase 255: In-App Rigging Assistant**
- Goal: accelerate rig setup with assistive tooling.
- Done when: assistant generates valid rig configurations with review checkpoints.

**Phase 256: Animation Preset Library**
- Goal: expose reusable high-quality animation presets.
- Done when: preset catalog integrates with retarget/blend runtime and governance.

**Phase 257: Collaborative Scene Editing**
- Goal: enable multi-user scene editing workflows.
- Done when: collaborative edits resolve conflicts deterministically with audit trails.

**Phase 258: Publish-to-XR Pipeline**
- Goal: streamline creator publish path into immersive runtimes.
- Done when: pipeline runs quality/compliance checks before XR distribution.

**Phase 259: Creator QA Simulation Harness**
- Goal: simulate XR interactions and animation quality before publish.
- Done when: harness provides reproducible scenario tests with pass/fail outputs.

**Phase 260: Creator XR Analytics Dashboard**
- Goal: provide creator-facing XR performance and engagement diagnostics.
- Done when: dashboard exposes actionable metrics tied to creator outputs.

### Track Y: Live XR Events and Social Animation (261-270)

**Phase 261: Shared Live Event Stages**
- Goal: support synchronized live stage experiences in XR.
- Done when: stage state, audience state, and host controls are productionized.

**Phase 262: Audience Choreography Engine**
- Goal: coordinate crowd reactions and movement patterns.
- Done when: choreography engine supports deterministic patterns with safety caps.

**Phase 263: Virtual Production Control Room**
- Goal: provide operator controls for live XR productions.
- Done when: control room APIs cover cues, camera, effects, and moderation states.

**Phase 264: Performer Avatar Switching**
- Goal: enable low-friction performer avatar transitions.
- Done when: avatar switch flow preserves identity/session continuity.

**Phase 265: Crowd Reaction Animation Systems**
- Goal: render large-scale audience reaction animation in real time.
- Done when: reaction system maintains fidelity within performance budgets.

**Phase 266: Interactive Narrative Branching in XR**
- Goal: support user-driven branching narratives in immersive sessions.
- Done when: branching logic remains deterministic and replay-auditable.

**Phase 267: Real-Time Event Moderation XR**
- Goal: enforce trust/safety controls during live immersive events.
- Done when: moderation actions are low-latency, auditable, and policy-bound.

**Phase 268: Replay and Highlight Capture**
- Goal: capture, index, and replay immersive event moments.
- Done when: replay artifacts are queryable with deterministic timeline references.

**Phase 269: Live Event Failover Drills**
- Goal: harden event resilience via failure simulation.
- Done when: drill workflows produce measurable recovery evidence and runbooks.

**Phase 270: Event Readiness Certification Gate**
- Goal: gate live XR events on readiness and safety criteria.
- Done when: non-certified event states automatically constrain go-live actions.

### Track Z: XR Rendering and Performance Hardening (271-280)

**Phase 271: Foveated Rendering Support**
- Goal: reduce render cost using gaze-aware rendering.
- Done when: foveated modes are capability-gated and quality-validated.

**Phase 272: Dynamic Resolution Governor**
- Goal: maintain frame targets under changing load.
- Done when: resolution scaling policy keeps frame-time within control bands.

**Phase 273: Occlusion/Culling Optimizer**
- Goal: optimize visible geometry workload in immersive scenes.
- Done when: culling pipeline reduces overdraw with correctness tests.

**Phase 274: Animation LOD Orchestration**
- Goal: scale animation complexity by relevance and distance.
- Done when: animation LOD policy preserves quality while reducing runtime cost.

**Phase 275: GPU Budget Controller**
- Goal: enforce GPU frame budget policies.
- Done when: GPU budget breaches trigger deterministic quality mitigations.

**Phase 276: CPU Frame Budget Controller**
- Goal: enforce CPU frame budget policies.
- Done when: CPU hotspots trigger bounded runtime fallback behavior.

**Phase 277: 90/120Hz Readiness Program**
- Goal: certify high-refresh XR runtime readiness.
- Done when: designated devices pass refresh-rate stability criteria.

**Phase 278: Thermal/Battery Adaptation**
- Goal: adapt runtime behavior to thermal and battery constraints.
- Done when: adaptation policies prevent unsafe throttling regressions.

**Phase 279: Network Jitter Compensation for Avatar Motion**
- Goal: smooth avatar movement under variable network conditions.
- Done when: jitter compensation improves continuity without authority violations.

**Phase 280: XR Performance Regression Gate**
- Goal: block performance regressions before release.
- Done when: XR perf gate enforces baseline thresholds in CI/release flow.

### Track AA: XR Trust, Safety, Accessibility, Compliance (281-290)

**Phase 281: Youth-Safe XR Mode**
- Goal: enforce child/youth-safe defaults in immersive experiences.
- Done when: youth mode constraints are mandatory and policy-auditable.

**Phase 282: Spatial Harassment Detection**
- Goal: detect proximity/interaction harassment patterns in XR.
- Done when: detector emits enforceable moderation signals with evidence context.

**Phase 283: Proximity Safety Envelopes**
- Goal: enforce personal-space and comfort envelopes.
- Done when: envelope violations trigger configurable runtime protections.

**Phase 284: Comfort and Motion Risk Labels**
- Goal: classify and surface motion/comfort risk for XR experiences.
- Done when: risk labels are generated and shown before session entry.

**Phase 285: Motion Sickness Risk Scoring**
- Goal: score risk factors for discomfort during immersive sessions.
- Done when: high-risk sessions trigger mitigation prompts or safe-mode defaults.

**Phase 286: 3D Accessibility Baseline v1**
- Goal: establish accessibility standards for XR interactions and UI.
- Done when: baseline a11y checks pass for core immersive journeys.

**Phase 287: Consent and Session Recording Controls**
- Goal: enforce explicit consent around recording/capture features.
- Done when: recording actions require policy-compliant consent state.

**Phase 288: Biometric Privacy Boundaries**
- Goal: constrain collection/use of biometric XR signals.
- Done when: biometric handling is policy-gated with audit evidence paths.

**Phase 289: Regional XR Compliance Overlays**
- Goal: apply region-specific XR compliance overlays at runtime.
- Done when: region overlays alter behavior via shared compliance policy engine.

**Phase 290: XR Audit Explainability Bundle**
- Goal: package XR compliance decisions into audit-ready bundles.
- Done when: bundle generation includes rationale, evidence links, and outcomes.

### Track AB: XR Economy, Distribution, Certification (291-300)

**Phase 291: Avatar Economy v1**
- Goal: define ownership/entitlement model for avatar assets and upgrades.
- Done when: avatar economy flows are policy-driven and auditable.

**Phase 292: Virtual Goods Ownership Physics Contract**
- Goal: standardize ownership/state semantics for immersive virtual goods.
- Done when: goods lifecycle contract prevents inconsistent ownership states.

**Phase 293: Cross-Platform XR Asset Portability**
- Goal: enable policy-safe portability of XR assets across runtimes.
- Done when: portability pipeline validates compatibility and rights constraints.

**Phase 294: Animation/Performance Rights Automation**
- Goal: automate rights checks for animations and captured performances.
- Done when: publish/distribution paths enforce rights policy automatically.

**Phase 295: Live Performance Revenue Share Engine**
- Goal: model and distribute live XR performance revenue shares.
- Done when: revenue shares are deterministic, explainable, and auditable.

**Phase 296: XR Asset Marketplace Fraud Controls**
- Goal: detect and mitigate marketplace abuse for XR assets.
- Done when: fraud controls can throttle/halt high-risk asset transactions.

**Phase 297: XR World Discovery and Ranking**
- Goal: improve immersive world discoverability and relevance.
- Done when: ranking policy is configurable, measurable, and governance-bounded.

**Phase 298: Distribution Orchestrator for VR/AR Endpoints**
- Goal: optimize content rollout across VR/AR distribution channels.
- Done when: orchestrator writes policy-compliant distribution actions.

**Phase 299: XR Launch Readiness and Store Compliance**
- Goal: certify XR releases against store/platform requirements.
- Done when: launch gate blocks non-compliant release states.

**Phase 300: XR Autonomy Maturity Certification v1**
- Goal: certify immersive autonomy systems against safety/compliance/performance criteria.
- Done when: maturity certification pass criteria are defined, checked, and evidenced.
