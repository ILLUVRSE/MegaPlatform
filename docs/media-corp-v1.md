# ILLUVRSE Media Corporation Status

ILLUVRSE Media Corporation currently has two different maturity levels in the repo:

- v1-v3 is real and usable as a synthetic/internal operating model.
- v4 executive planning, governance, and autonomy exists mostly as schema/type/service surface area ahead of a full end-to-end runtime.

The current admin surface in `apps/web/app/admin/media-corp` is honest to describe as a sandbox-backed media-corp simulator with review, release, publishing, attribution, and recommendation loops.

## What is actually implemented now

- canon-aware planning and franchise seeding
- production bundle and release-candidate generation
- review decisions from the admin dashboard
- sandbox channel routing and sandbox publish records
- manual/demo metrics ingestion
- metrics rollups and strategy recommendation generation
- Prisma-backed snapshots and memory history

## What is not fully implemented as runtime

- broad third-party distribution adapters
- autonomous executive decision execution across the full v4 schema surface
- fully automated governance/approval/escalation loops matching the entire Prisma model
- real-world telemetry ingestion across external platforms

## Current runtime posture

The runtime is intentionally inspectable and conservative:

- publishing is sandbox-only by default
- metrics can be synthetic/manual
- recommendation logic is rule-based and reviewable
- the system seeds demo state when the dashboard has no prior snapshot

## v3 operating model

ILLUVRSE Media Corporation began as a canon-aware planning system, expanded into a production system, and now extends into a distribution and learning system. v3 routes approved release candidates into channels, tracks publish execution, ingests performance, attributes results across the creative graph, and turns those outcomes into explicit strategy recommendations.

## What v3 Adds

- first-class channel registry, publish targets, and publish windows
- tracked publish attempts and publish results
- provider-agnostic distribution adapter interface with a sandbox adapter
- campaigns, campaign items, audience segments, and lightweight experiments
- performance events, performance snapshots, and metrics rollups
- attribution from publish outcome back to franchise, bundle, prompt, agent, channel, and experiment
- strategy recommendations and momentum updates driven by post-release results

## Reused Seams

- `packages/media-corp-core`
  Shared types now include distribution, attribution, and learning models.
- `packages/media-corp-orchestrator`
  The same cycle runner now executes publish, metrics, and recommendation stages.
- `packages/media-corp-scoring`
  Scoring now covers metrics rollups and recommendation generation.
- `packages/media-corp-canon`
  Prisma-backed persistence remains the main system of record and snapshot loader.
- `apps/web/app/admin/media-corp`
  The same admin surface now exposes distribution controls, metrics ingestion, and executive reporting.

## Distribution Model

### Channels

Channels define where release candidates can go and what they require.

Examples in v3:

- wall posts
- shorts feed
- home feed modules
- sandbox demo

Each channel defines:

- supported artifact types
- supported release statuses
- scheduling modes
- required package fields
- experimentation support
- audience controls

### Publish Objects

- `PublishTarget`
  Specific surface inside a channel.
- `PublishWindow`
  Scheduling window metadata.
- `PublishAttempt`
  A tracked execution record for scheduled, immediate, sandbox, or dry-run publication.
- `PublishResult`
  The resolved output of a publish attempt, including placement/permalink/slug.
- `PublishFailure`
  Failure metadata for incomplete or failed attempts.

## Adapter Layer

v3 introduces a provider-agnostic adapter interface. The first concrete adapter is a sandbox-safe internal adapter.

Adapter responsibilities:

- validate channel support
- transform release candidates into channel-ready publish payloads
- execute sandbox or dry-run publication
- return persisted attempt and result objects

Current adapter:

- `sandboxDistributionAdapter`
  Safe internal execution path for demos and local admin testing.

## Performance and Attribution

v3 introduces a metrics graph rather than disconnected counters.

Core objects:

- `PerformanceEvent`
- `PerformanceSnapshot`
- `ContentMetricsRollup`
- `ChannelMetricsRollup`
- `FranchiseMetricsRollup`
- `PromptPerformanceRollup`
- `AgentPerformanceRollup`

The system attributes performance back to:

- franchise
- artifact bundle
- release candidate
- distribution package
- channel
- prompt template and prompt run
- agent role
- campaign
- experiment
- audience segment

## Campaigns and Experiments

Campaigns group coordinated pushes across release candidates and channels.

Examples:

- franchise launch
- shorts burst
- trailer push
- game concept test wave

Experiments are lightweight and currently support:

- variant key
- hypothesis
- package overrides
- completion status
- notes

## Strategy Recommendations

v3 generates inspectable recommendations such as:

- promote strong franchises
- suppress weak channel allocations
- reuse high-performing prompt templates in new campaigns

Recommendations are explicit objects with:

- recommendation type
- rationale
- confidence
- suggested action

## Admin Surface

Use `/admin/media-corp` to inspect and control:

- channel registry
- publish queue
- publish attempt history
- campaigns
- experiments
- performance dashboards
- attribution and rollups
- strategy recommendations
- sandbox publish controls
- manual metrics ingestion

Current APIs:

- `POST /api/admin/media-corp/run`
- `POST /api/admin/media-corp/review`
- `POST /api/admin/media-corp/release`
- `GET/POST /api/admin/media-corp/channels`
- `POST /api/admin/media-corp/publish`
- `POST /api/admin/media-corp/metrics`
- `GET /api/admin/media-corp/summary`

## How v3 Extends v2

v2 stopped at reviewable production bundles and release candidates.

v3 continues from those release candidates by:

1. assigning them to channels
2. creating publish attempts and results
3. generating or ingesting performance snapshots
4. building attribution rollups
5. emitting strategy recommendations
6. feeding results back into franchise tier and momentum

## Current Limitations

- publishing is intentionally centered on internal/sandbox-safe execution, not broad third-party integrations
- metrics ingestion is currently synthetic/manual for demo use, though the model is ready for adapter-based ingestion
- recommendation logic is rule-based and inspectable, not opaque
- the wider repo still has unrelated Prisma/type noise outside this feature slice, so verification remains scoped

## Likely Next Phase

- connect real internal surfaces to non-sandbox adapters
- stream real post-release telemetry into performance ingestion
- add richer campaign budgeting and pacing logic
- support revision loops based on poor publish outcomes
- introduce deeper attribution views across prompts, agents, and audience segments
