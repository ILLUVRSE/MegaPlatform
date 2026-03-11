# ILLUVRSE Monorepo Intelligence Report

Date: 2026-03-07
Analyst: Codex GPT-5
Scope: full repository review of code, packages, apps, scripts, ops assets, migrations, and documentation in `/home/ryan/ILLUVRSE`

## 1. Executive Summary

### What ILLUVRSE is

ILLUVRSE is a monorepo for a multi-product entertainment platform that is trying to unify:

- a consumer-facing platform shell
- streaming and watch surfaces
- creator tooling and content production
- social/party systems
- social feed and shorts
- game publishing and embedded gameplay
- operational automation and governance
- several adjacent or incubated products such as News, Art Atlas, What2Watch, PixelBrawl, GameGrid, and Ambush Soccer

The actual implemented center of gravity is `apps/web`, a Next.js App Router application that acts as the platform shell and primary integration surface.

### Main systems

The platform resolves into three layers:

| Layer | Primary implementation | Role |
| --- | --- | --- |
| Platform shell | `apps/web` | Unified UI, auth, admin, watch, feed, studio, party, games, external app launch |
| Shared backend/runtime packages | `packages/db`, `packages/world-state`, `packages/storage`, `packages/agent-manager`, `packages/watch-scheduler`, `packages/audit`, `packages/ui` | Data, realtime state, storage, background work, scheduling, audit, tokens |
| Satellite products | `apps/news`, `apps/gamegrid`, `apps/pixelbrawl`, `apps/art-atlas`, `apps/what2watch`, `apps/ambush-soccer` | Standalone or semi-integrated experiences with their own runtime models |

There is also a fourth layer that matters strategically:

| Layer | Primary implementation | Role |
| --- | --- | --- |
| Governance/spec/intelligence corpus | `docs/`, `ops/governance`, many `apps/web/lib/*` mirrors | Operating model, future contracts, policy docs, simulated platform capabilities |

### Problems the platform solves

Implemented problems:

- unified entertainment shell across watch, games, social, and creator tools
- admin CRUD for streaming catalog and platform operations
- basic profile-based streaming access
- basic social wall and shorts feed
- creator studio with asynchronous rendering workflow
- watch party orchestration with Redis-backed realtime state
- external app integration for News, GameGrid, PixelBrawl, Art Atlas
- lightweight monetization scaffolding for premium shorts and premium watch items

Planned or partially scaffolded problems:

- creator identity, portability, progression, revenue attribution
- autonomy/governance workflows
- XR/runtime governance
- compliance evidence and certification workflows
- intelligent orchestration across products

### Architectural philosophy

The repo follows a hybrid philosophy:

1. Product-first consolidation
   - Put many capabilities in one monorepo.
   - Use one primary shell to unify user journeys.

2. Thin shared package core
   - Keep only a few hard platform packages.
   - Let most behavior live in app-level code.

3. Contract-heavy development
   - Encode governance and future architecture in docs and JSON manifests early.
   - Mirror many concepts into TypeScript modules and API routes before there is fully corresponding infrastructure.

4. Progressive implementation
   - Real systems are built for core experiences.
   - Many advanced systems are present as policy modules, scoring engines, route stubs, or deterministic simulators rather than production-grade services.

### Strengths

- Clear monorepo center: `apps/web` plus shared packages.
- Good shared data foundation via Prisma/Postgres.
- Reusable Redis-backed realtime model for party/minigame state.
- Asynchronous creator pipeline is coherently structured.
- Boundary linting, governance checks, migration linting, and shipcheck scripts are present and working.
- Strong test volume in `apps/web` and `apps/gamegrid`.
- Satellite apps are meaningfully differentiated products rather than clones.
- The repo already encodes a broad product vision instead of a narrow app.

### Weaknesses

- The codebase mixes implemented systems, stubs, and speculative architecture at very high density.
- `apps/web/lib` is oversized and acts as a dumping ground for both production helpers and conceptual policy engines.
- The number of API routes in `apps/web` is extremely high relative to the underlying service decomposition.
- Access control is coarse in practice even though governance artifacts imply deeper policy sophistication.
- Some monetization, voice, upload, and moderation flows are scaffolded but not production-complete.
- Horizontal scalability assumptions are weak in multiple places, especially rate limiting and Next.js-embedded service logic.
- The repo is not a cleanly separated platform microservice architecture; it is a large application monolith with adjunct workers and side apps.

### Bottom-line assessment

ILLUVRSE today is best described as:

- a real monolithic platform shell with working subsystems for watch, feed, studio, party, admin, and games
- plus several real standalone apps
- plus a very large strategic operating-system layer that is much more mature as documentation and policy than as runtime infrastructure

That creates strong vision and weak execution boundaries. The architecture is ambitious and directionally coherent, but the implementation maturity is uneven.

## 2. Full Repository Structure

### Top-level map

Generated artifacts such as `node_modules`, `.next`, and `dist` are excluded from the structural explanation below except where they reveal repo hygiene issues.

```text
/
├── apps/
│   ├── web/                Core ILLUVRSE shell
│   ├── news/               Standalone news + podcast platform
│   ├── gamegrid/           Large HTML5 game portal
│   ├── pixelbrawl/         1v1 lane fighter
│   ├── art-atlas/          Culture/discovery app
│   ├── what2watch/         Watch discovery MVP
│   └── ambush-soccer/      Multiplayer soccer game
├── packages/
│   ├── db/                 Shared Prisma schema and client
│   ├── world-state/        Redis-backed realtime state
│   ├── storage/            S3-compatible helpers
│   ├── agent-manager/      BullMQ jobs and ops task system
│   ├── watch-scheduler/    Live channel schedule generation
│   ├── audit/              Audit adapter abstraction
│   └── ui/                 Shared design tokens
├── docs/                   Large architecture/spec corpus
├── ops/                    Governance JSON, runbooks, agent definitions
├── scripts/                Monorepo validation and release gates
├── server/                 Ambush Soccer server workspace
├── src/                    Ambush Soccer client source
├── tests/                  Ambush Soccer tests
├── README.md               Monorepo overview
├── package.json            Root scripts and orchestration
└── pnpm-workspace.yaml     Workspace package selection
```

### Top-level purpose and responsibilities

| Path | Purpose | Key dependencies | Main responsibilities | Key files |
| --- | --- | --- | --- | --- |
| `apps/web` | Primary platform shell | Next.js, React 19, NextAuth, Prisma, Redis, shared packages | watch, feed, shorts, party, studio, admin, app integration | `app/`, `lib/`, `middleware.ts`, `tests/`, `README.md` |
| `apps/news` | News/podcast platform | Fastify, Prisma, BullMQ, Next.js | article ingest, clustering, ranking, podcasts, admin, web UI | `api/src/server.ts`, `workers/src/processors/pipelineWorkers.ts`, `docs/architecture.md` |
| `apps/gamegrid` | HTML5 multi-game portal | Vite, React, Phaser | game portal UX, large game catalog, multiplayer adapters | `src/App.tsx`, `src/games/`, `src/mp/`, `README.md` |
| `apps/pixelbrawl` | Standalone fighting game | Phaser | combat engine, render stack, roster/assets | `src/main.js`, `src/engine/`, `src/render/` |
| `apps/art-atlas` | Cultural discovery app | Next.js | artist/artwork browsing, media access, dataset validation | `app/`, `lib/data.ts`, `data/` |
| `apps/what2watch` | Watch discovery MVP | Next.js, Prisma, TMDB | recommendation queue, trends, watchlist, notifications | `app/`, `lib/services/`, `prisma/schema.prisma` |
| `apps/ambush-soccer` | Multiplayer soccer game | Vite, Phaser, ws | gameplay, online session UX, host-authoritative netcode | `src/`, `server/src/` |
| `packages/db` | Shared data layer | Prisma, Postgres | schema, migrations, client export, seed data | `schema.prisma`, `migrations/`, `seed.ts` |
| `packages/world-state` | Realtime state layer | ioredis | party/minigame state, pub/sub, seat reservation | `src/server.ts` |
| `packages/storage` | Storage abstraction | AWS SDK S3 | signed uploads, object inspection, deletion | `src/index.ts` |
| `packages/agent-manager` | Background jobs + ops queue | BullMQ, Redis, Prisma, Sharp | studio job enqueue/worker, ops tasks/director/specialists | `src/index.ts`, `src/worker.ts`, `src/render.ts`, `src/ops/` |
| `packages/watch-scheduler` | Live scheduling worker | Prisma, agent-manager | live program generation, director wrapper | `src/lib.ts`, `src/director.ts` |
| `packages/audit` | Audit sink interface | Prisma client types | DB and console audit adapters | `src/index.ts` |
| `packages/ui` | Shared UI base | CSS only | design tokens export | `src/tokens.css` |
| `docs` | Platform spec corpus | Markdown | architecture, contracts, future systems, runbooks | `platform-domain-map.md`, `watch-platform.md`, `home-feed.md`, many XR/autonomy docs |
| `ops` | Governance and operations assets | JSON, Markdown | policy manifests, runbooks, agent configs | `governance/*.json`, `README.md` |
| `scripts` | Quality gates | Node scripts | boundaries, governance, supply-chain, migration lint, shipcheck | `shipcheck.mjs`, `check-boundaries.mjs`, `governance-check.mjs` |

### Major subtree details

#### `apps/web`

```text
apps/web/
├── app/
│   ├── api/                367 route handlers
│   ├── admin/              Admin UI
│   ├── watch/              Streaming surfaces
│   ├── party/              Watch party UI
│   ├── studio/             Creator tooling
│   ├── shorts/             Shorts feed and detail
│   ├── games/              Game creation/catalog surfaces
│   ├── home/               Social/home feed
│   ├── apps/               Platform app directory
│   ├── news/               Integrated launcher
│   ├── gamegrid/           Integrated launcher
│   ├── pixelbrawl/         Integrated launcher
│   └── art-atlas/          Integrated launcher
├── components/             Shared UI and admin components
├── lib/                    Core business logic and many policy/spec modules
├── tests/
│   ├── unit/               291 unit tests
│   └── e2e/                Playwright journeys
├── middleware.ts           Admin and watch gating + security headers
├── next.config.ts          Next.js config
└── README.md               Platform shell setup
```

Responsibilities:

- user-facing hub and navigation
- auth/session management
- watch content and profile UX
- social feed and shorts
- party orchestration
- creator studio
- admin data and ops control plane
- embedding or linking external products

Key dependencies:

- `@illuvrse/db`
- `@illuvrse/world-state`
- `@illuvrse/storage`
- `@illuvrse/agent-manager`
- `@illuvrse/audit`
- `@illuvrse/ui`
- NextAuth

Important key files:

- `apps/web/app/api/*`
- `apps/web/lib/auth.ts`
- `apps/web/lib/authz.ts`
- `apps/web/lib/rateLimit.ts`
- `apps/web/lib/adminLiveScheduler.ts`
- `apps/web/lib/platformApps.ts`
- `apps/web/middleware.ts`

#### `apps/news`

```text
apps/news/
├── api/                    Fastify API
├── workers/                BullMQ worker pipeline
├── web/                    Next.js frontend
├── lib/                    Ranking, clustering, search, podcast logic
├── tests/                  Unit, integration, performance
└── docs/architecture.md    Architecture decisions
```

Responsibilities:

- ingest RSS/news sources
- canonicalize and cluster articles
- summarize clusters
- run evaluation and ranking
- generate podcasts and feeds
- expose admin and personalized endpoints

This app is the most microservice-like product in the repo.

#### `apps/gamegrid`

This is a very large standalone gaming product, with a broad game library, stubs, docs, and multiplayer adapter system. It has its own product gravity and is materially larger in file count than `apps/web`.

Important subtrees:

- `src/games/` large collection of games
- `src/mp/` multiplayer adapters and protocol
- `src/pages/` portal pages
- `docs/` extensive design specs

#### `apps/pixelbrawl`

Lean but complete standalone game structure:

- `src/engine/` deterministic rules
- `src/render/` view and assets
- `src/state/` saves and progression
- `src/story/` narrative system

#### `apps/art-atlas`

Dataset-driven Next.js app:

- lower operational complexity
- strong content/data validation
- mostly static content architecture plus runtime media fetches

#### `apps/what2watch`

Independent MVP with its own Prisma schema and no shared package coupling to the platform DB. It is effectively an incubated separate product, not a module of the shared platform.

#### `apps/ambush-soccer`

Independent multiplayer game with split client/server implementation. It also exists at the repo root as `src/`, `server/`, and `tests/`, which creates some structural ambiguity compared with the `apps/*` norm.

### Documentation and ops structure

`docs/` and `ops/` are not incidental. They form a secondary architecture:

- `docs/*.md`: capability specs, contracts, roadmaps, domain maps, runbooks
- `ops/governance/*.json`: machine-checked governance/policy manifests
- `ops/agents/*.md`: role definitions

This is one of the defining characteristics of the repo: documentation is not just explanatory; it is part of the platform operating model.

## 3. System Architecture Map

### A. Platform shell

| Attribute | Detail |
| --- | --- |
| Purpose | Unified user entrypoint across media, games, social, and creation |
| Inputs | HTTP requests, sessions, cookies, DB content, Redis state, external app URLs |
| Outputs | Next.js pages, JSON APIs, embedded external modules, admin controls |
| Dependencies | `@illuvrse/db`, `@illuvrse/world-state`, `@illuvrse/storage`, `@illuvrse/agent-manager` |
| Internal modules | `app/`, `components/`, `lib/auth*`, `lib/platformApps.ts`, `middleware.ts` |

Notes:

- This is the actual platform spine.
- It is still monolithic: most business logic stays inside the app instead of moving into packages or services.

### B. Watch system

| Attribute | Detail |
| --- | --- |
| Purpose | On-demand shows, live channels, profiles, progress, entitlements |
| Inputs | `Show`, `Season`, `Episode`, `LiveChannel`, `LiveProgram`, `Profile`, `WatchProgress` |
| Outputs | watch pages, featured rails, playback metadata, profile APIs |
| Dependencies | Prisma, cookies, NextAuth, `watchEntitlements.ts`, `adminLiveScheduler.ts` |
| Internal modules | `app/watch/*`, `app/api/watch/*`, `lib/watchProfiles.ts`, `lib/watchEntitlements.ts` |

Submodules:

- catalog and detail
- profile selection and kids mode
- progress persistence
- live TV and EPG
- scheduler/admin controls

### C. Party system

| Attribute | Detail |
| --- | --- |
| Purpose | Synchronous watch rooms with seats, playlist, presence, playback sync, voice hooks |
| Inputs | `Party`, `Seat`, `PlaylistItem`, `Participant`, Redis world-state, session principal |
| Outputs | SSE event streams, party state, playlist changes, LiveKit tokens |
| Dependencies | Prisma, Redis, world-state package, LiveKit token helper |
| Internal modules | `app/party/*`, `app/api/party/*`, `packages/world-state` |

Submodules:

- room creation/join
- seat reservation and locking
- leader playback synchronization
- playlist management
- presence heartbeat
- voice token issue path
- minigame-party mode

### D. Studio / creator pipeline

| Attribute | Detail |
| --- | --- |
| Purpose | Creator project management, uploads, render jobs, publishing, asset lifecycle |
| Inputs | `StudioProject`, `AgentJob`, `StudioAsset`, uploads, templates, project metadata |
| Outputs | assets, jobs, published `ShortPost`, revenue attribution, creator progression |
| Dependencies | Prisma, BullMQ, Redis, S3-compatible storage, ffmpeg, Sharp |
| Internal modules | `app/studio/*`, `app/api/studio/*`, `app/api/uploads/*`, `packages/agent-manager` |

Submodules:

- project CRUD
- direct-to-S3 upload signing/finalization
- queue-backed render jobs
- remix jobs and template reuse
- publish pipeline to shorts/feed
- ops task board and job retry/cancel

### E. Feed / shorts / social system

| Attribute | Detail |
| --- | --- |
| Purpose | Home wall, shorts ranking, comments, reactions, reports, sharing |
| Inputs | `FeedPost`, `ShortPost`, `ShortPurchase`, reports, comments, reactions |
| Outputs | wall feed, shorts feed, moderation actions, engagement metrics |
| Dependencies | Prisma, anon cookie helpers, ranking helpers |
| Internal modules | `app/home/*`, `app/shorts/*`, `app/api/feed/*`, `app/api/shorts/*`, `lib/feed*.ts`, `lib/shortsRanking.ts` |

Submodules:

- anonymous identity
- wall ranking
- shorts ranking
- share and report flows
- moderation flags
- premium access check

### F. Games infrastructure

| Attribute | Detail |
| --- | --- |
| Purpose | Game catalog, UGC minigame creation, external game integration, telemetry |
| Inputs | `UserGame`, `UserGameVersion`, minigame specs, external app URLs |
| Outputs | playable game pages, generated specs, publish state, telemetry events |
| Dependencies | Prisma, platform app registry, minigame generator logic |
| Internal modules | `app/games/*`, `app/api/gamegrid/games/*`, `lib/minigame/*`, `lib/gamegrid/*` |

Submodules:

- generated minigames
- community/my/publish flows
- external GameGrid launcher
- telemetry collection

### G. Admin platform

| Attribute | Detail |
| --- | --- |
| Purpose | Operations, content CRUD, monetization, live scheduling, governance surfaces |
| Inputs | all major DB entities, policy modules, audit sink |
| Outputs | admin dashboards, CRUD actions, policy evaluations, audit logs |
| Dependencies | Prisma, NextAuth RBAC, audit package |
| Internal modules | `app/admin/*`, `app/api/admin/*`, `lib/audit.ts`, `lib/rbac.ts` |

Important reality check:

- Many admin routes are deterministic evaluators over TypeScript policy modules, not separate backend systems.
- The admin surface is more expansive than the platform’s actual service decomposition.

### H. External integrated apps

| App | Integration mode | Primary role |
| --- | --- | --- |
| News | External URL registered in platform directory | editorial intelligence |
| GameGrid | external/embedded portal app | games portal |
| PixelBrawl | external/embedded portal app | fighter game |
| Art Atlas | external/embedded portal app | culture/discovery |

Implemented via `apps/web/lib/platformApps.ts` and `EmbeddedPlatformApp`.

### I. Data layer

| Attribute | Detail |
| --- | --- |
| Purpose | Central persistence for platform shell |
| Implementation | Prisma + Postgres |
| Scope | users, roles, watch, party, studio, feed, creator economy, platform events |
| Package | `packages/db` |

### J. API layer

The API layer is mostly in-process route handlers in Next.js rather than separate services. This matters:

- simpler local development
- tighter coupling between UI and domain code
- more deployment convenience
- less isolation for scaling and security boundaries

### K. External integrations

| Integration | Usage |
| --- | --- |
| Postgres | primary platform persistence |
| Redis | world state, queues |
| S3-compatible storage | uploads and render outputs |
| LiveKit | token issuance and future voice transport |
| TMDB | What2Watch metadata |
| RSS feeds | News ingest |
| Wikimedia Commons | Art Atlas media |

## 4. Data Model and Database Structure

### Main shared database

The shared database is in `packages/db/schema.prisma`. It is a broad product database, not a narrow service schema.

Core clusters:

1. Identity and access
   - `User`
   - `Role`
   - `Account`
   - `Session`
   - `VerificationToken`

2. Watch/media
   - `Show`
   - `Season`
   - `Episode`
   - `Profile`
   - `MyListItem`
   - `WatchProgress`
   - `LiveChannel`
   - `LiveProgram`
   - `SchedulerRun`

3. Party
   - `Party`
   - `Seat`
   - `PlaylistItem`
   - `Participant`

4. Studio/creator pipeline
   - `StudioProject`
   - `AgentJob`
   - `StudioAsset`
   - `AssetLineage`
   - `ContentQaResult`
   - `RemixJob`
   - `StudioTemplate`
   - `StudioTemplateVersion`

5. Feed and shorts
   - `ShortPost`
   - `ShortPurchase`
   - `FeedPost`
   - `FeedReaction`
   - `FeedComment`
   - `FeedReport`

6. Creator economy and identity
   - `CreatorProfile`
   - `RevenueAttribution`
   - `CreatorProgression`
   - `CreatorProgressEvent`

7. Platform/governance
   - `ContentItem`
   - `ContentAsset`
   - `ContentStateTransition`
   - `DistributionAction`
   - `AdminAudit`
   - `PlatformEvent`
   - `UserGame`
   - `UserGameVersion`

### Entity relationship overview

```text
User
├── Account / Session
├── Profile
│   ├── MyListItem
│   └── WatchProgress -> Episode -> Season -> Show
├── StudioProject
│   ├── AgentJob
│   ├── StudioAsset -> AssetLineage
│   ├── ContentQaResult
│   ├── RemixJob
│   └── ShortPost
├── CreatorProfile
│   ├── StudioProject
│   ├── StudioTemplate -> StudioTemplateVersion
│   ├── RevenueAttribution
│   ├── CreatorProgression
│   └── CreatorProgressEvent
├── Party host / Participant
└── Feed / content authorship

Party
├── Seat
├── PlaylistItem -> Episode?
└── Participant

FeedPost
├── ShortPost?
├── Show?
├── Episode?
├── LiveChannel?
├── FeedReaction
├── FeedComment
├── FeedReport
└── FeedShare self-reference
```

### Critical tables

| Table | Importance | Notes |
| --- | --- | --- |
| `User` | core identity anchor | role stored as string, not FK to `Role` |
| `Show` / `Season` / `Episode` | watch backbone | drives on-demand and part of live scheduling |
| `Profile` | household profile context | critical for kids restrictions |
| `Party` + Redis state | social sync backbone | DB stores canonical room metadata; Redis stores live state |
| `StudioProject` / `AgentJob` / `StudioAsset` | creator pipeline backbone | strongest implemented async subsystem |
| `ShortPost` / `FeedPost` | content distribution backbone | social feed joins studio and watch |
| `CreatorProfile` / `RevenueAttribution` | creator economy backbone | scaffolded but structurally important |
| `LiveChannel` / `LiveProgram` | live TV scheduling | synthetic schedule generation |
| `PlatformEvent` | analytics/event ledger | lightweight event sink |

### Data flow patterns

#### Watch flow

`Show` -> `Season` -> `Episode` -> `WatchProgress`

User session + profile cookie determines:

- profile identity
- kids restrictions
- my list scope
- progress scope

#### Party flow

- canonical party metadata in Postgres
- ephemeral seat/playback/presence state in Redis
- SSE event fanout from Redis pub/sub

This split is sound in principle.

#### Studio flow

- project and jobs persisted in Postgres
- binary assets stored in S3-compatible storage
- render jobs queued in Redis via BullMQ
- publish creates `ShortPost`
- feed may reference `ShortPost`

#### Creator economy flow

- `ShortPurchase` creates per-post purchase record
- purchase can create `RevenueAttribution`
- purchase can create `CreatorProgressEvent`

This is structurally correct but commercially incomplete because payment settlement is stubbed.

### Potential scaling issues

1. Large multi-domain schema in one database
   - watch, social, studio, creator, admin, and platform events all live together
   - this simplifies joins but centralizes blast radius

2. Hot feed reads
   - feed ranking uses in-app query-and-rerank
   - this is manageable at small scale, weak at high scale

3. Studio write amplification
   - one creator action can touch project, jobs, assets, purchases, attribution, progression

4. Live schedule generation
   - scheduler writes row-by-row loops without batch strategy

5. Event and audit growth
   - `PlatformEvent`, `AdminAudit`, `FeedReport`, `CreatorProgressEvent`, `RevenueAttribution` can become large quickly

### Normalization issues

Notable normalization compromises:

- `User.role` is a raw string while `Role` exists as a separate table.
- `FeedPost.authorProfile` is a string, not a normalized profile relation.
- multiple tables store flexible JSON blobs (`specJson`, `metaJson`, `metadataJson`, `issuesJson`, `schemaJson`, `provenanceJson`).
- arrays on `Show` (`genres`, `tags`, `cast`) are denormalized for convenience.

These choices are pragmatic for speed, but they reduce relational rigor.

### Missing indexes and likely index gaps

The schema has reasonable baseline indexes, but likely gaps remain:

| Table | Possible gap | Why it matters |
| --- | --- | --- |
| `Party` | index on `hostId` | host-owned room listings or admin host queries |
| `Participant` | index on `userId` | user party membership lookup |
| `FeedReport` | index on `resolvedAt` or `(resolvedAt, createdAt)` | admin report queues |
| `ShortPost` | index on `publishedAt` | shorts pagination and ranking candidates |
| `ShortPurchase` | unique constraint on `(shortPostId, buyerId)` and `(shortPostId, buyerAnonId)` patterns | duplicate purchase protection stronger than app logic |
| `LiveProgram` | index on `(channelId, endsAt)` | scheduler lookups for last program |
| `AdminAudit` | index on `adminId, createdAt` | admin auditing and forensics |
| `DistributionAction` | index on `targetType, targetId` | action lookups by entity |

### Integrity risks

Highest integrity risks:

1. `User.role` not enforced by FK
   - invalid role strings are possible

2. `Party.hostId` is not relationally linked to `User`
   - host user deletion or mismatch is possible

3. `ShortPurchase` lacks stronger uniqueness semantics
   - duplicate purchase rows are prevented by app logic, not schema-level uniqueness

4. `ShortPost.createdById`, `RevenueAttribution.projectId`, and several other optional ownership fields are nullable
   - this helps migrations but weakens ownership guarantees

5. `storageKey` and `url` consistency in `StudioAsset`
   - integrity mostly enforced in routes, not schema

## 5. Dependency Graph

### Workspace dependency graph

```text
@illuvrse/web
├── @illuvrse/db
├── @illuvrse/storage
├── @illuvrse/world-state
├── @illuvrse/agent-manager
├── @illuvrse/audit
└── @illuvrse/ui

@illuvrse/agent-manager
├── @illuvrse/db
└── @illuvrse/storage

@illuvrse/watch-scheduler
├── @illuvrse/db
└── @illuvrse/agent-manager

@illuvrse/news
└── self-contained workspaces (api, workers, web)

Other apps
└── mostly self-contained
```

### Observed coupling

#### Tight coupling areas

1. `apps/web` <-> `packages/db`
   - pervasive direct Prisma access from route handlers and pages
   - this is efficient but makes the shell highly database-aware

2. `apps/web` <-> `packages/world-state`
   - party flows are hard-wired to Redis implementation

3. `apps/web` <-> `packages/agent-manager`
   - studio APIs directly enqueue jobs and inspect queues

4. `packages/watch-scheduler` -> internal `agent-manager` path
   - `packages/watch-scheduler/src/director.ts` imports `../../agent-manager/src/ops/director`
   - this bypasses package encapsulation and is a real boundary smell

5. `apps/web/lib/*`
   - too many domains cohabit one folder
   - this is internal coupling more than package coupling

### Circular dependencies

At workspace/package level, no obvious circular dependency was found.

At internal module level, the repo likely has local cyclic complexity inside app code, but package-level cycles are not the main problem. The main problem is centralization into `apps/web`.

### Duplication

Material duplication exists in three forms:

1. Docs-to-code mirroring
   - many files in `docs/` have matching TypeScript logic modules in `apps/web/lib/`
   - this is sometimes intentional, but it increases maintenance drag

2. Separate but similar product stacks
   - `apps/web` watch/feed functionality overlaps conceptually with `apps/what2watch`
   - `apps/web` embedded app strategy overlaps with standalone apps that maintain their own UI/runtime models

3. Repeated auth/profile gate patterns
   - watch routes repeatedly resolve session + profile cookie + DB profile lookup

### Areas that should be modularized

Highest ROI modularization candidates:

- `apps/web/lib/auth*`, `rbac`, `rateLimit` into a shared platform-core package
- `apps/web/lib/feed*` and feed route logic into a feed domain module
- `apps/web/lib/watch*` and watch route logic into a watch domain module
- `apps/web/lib/creator*` and studio APIs into a creator domain package
- autonomy/XR/policy evaluator modules into a separate `packages/policy-runtime` or `packages/governance-runtime`

## 6. Runtime System Flow

### Production request lifecycle

#### Standard page/API request

```text
Client
  -> Next.js route/page in apps/web
  -> middleware applies security headers and route gating
  -> route handler/page reads session via NextAuth
  -> business logic in apps/web/lib/*
  -> Prisma queries shared Postgres
  -> optional Redis interaction for realtime/queues
  -> JSON or rendered HTML response
```

### Frontend to backend flow

#### Watch flow

```text
Browser
  -> /watch page
  -> Next.js server page or /api/watch/*
  -> Prisma loads shows/seasons/episodes/live channels
  -> session + profile cookie determine access
  -> page renders media cards/player metadata
```

#### Party flow

```text
Browser
  -> POST /api/party/create or /join
  -> Prisma persists canonical room/participant rows
  -> world-state package writes live state to Redis
  -> browser subscribes to /api/party/[code]/events SSE
  -> Redis pub/sub emits seat/playback/presence events
  -> clients update in near real time
```

#### Studio flow

```text
Browser
  -> POST /api/studio/projects
  -> POST /api/uploads/sign
  -> direct PUT to S3/MinIO
  -> POST /api/uploads/finalize
  -> POST /api/studio/projects/[id]/jobs
  -> BullMQ enqueue via @illuvrse/agent-manager
  -> worker renders/transcodes/uploads assets
  -> Prisma updates AgentJob and StudioProject status
  -> publish creates ShortPost and feed references
```

### Backend to database flow

The common backend pattern is direct Prisma from route handlers. There is very little service-layer isolation. This yields:

- fast iteration
- simple call graph
- high app-to-database coupling

### Background processing

#### Platform shell background processing

- `@illuvrse/agent-manager` BullMQ worker for studio jobs
- `@illuvrse/watch-scheduler` for live schedule generation
- ops task queue and director/specialist loops

#### News background processing

- dedicated multi-queue worker pipeline:
  - ingest
  - canonicalize
  - dedup
  - summarize
  - evaluate
  - rank
  - source reputation
  - personalization
  - experiment evaluation
  - podcast/TTS
  - RSS publish
  - dead-letter

### Event systems

Implemented event-like systems:

- Redis pub/sub for party and minigame rooms
- BullMQ queue events for studio and news workers
- DB-backed `PlatformEvent`
- DB-backed audit and monetization event rows

Missing event platform features:

- durable event bus abstraction
- replayable cross-domain event contracts
- strong telemetry/observability correlation

## 7. Performance and Scalability Analysis

### Top bottlenecks

#### 1. `apps/web` monolith breadth

Risk level: High

Why:

- 367 API route handlers inside one Next.js app
- 67 pages
- 291 unit tests
- wide domain spread

Impact:

- deploy-time complexity
- cognitive load
- larger runtime memory footprint
- more cold-start surface in serverless or edge-like deployment models

#### 2. In-process ranking and filtering

Risk level: High

Examples:

- feed wall ranking fetches candidates then re-ranks in memory
- shorts ranking does candidate fetch and application-level sort
- What2Watch home/discover ranking is also in-app and broad fetch oriented

Impact:

- inefficient at scale
- harder to cache deterministically
- DB work and application CPU grow together

#### 3. In-memory rate limiting

Risk level: High

`apps/web/lib/rateLimit.ts` uses local memory buckets and explicitly falls back even when Redis mode is intended.

Impact:

- no cross-instance enforcement
- uneven abuse protection
- hot-process memory growth

#### 4. Sequential schedule generation and worker loops

Risk level: Medium

Examples:

- live scheduler creates programs row-by-row
- studio worker does multiple DB roundtrips per job and per asset
- News workers do many queue hops and writes

Impact:

- acceptable at low scale
- inefficient at higher ingest or creator throughput

#### 5. Large `apps/web/lib` surface

Risk level: Medium

Not a runtime hot path by itself, but it tends to:

- increase build times
- increase bundling risk
- hide dead code
- mix spec and production code

### Large component trees and rendering inefficiencies

Potential concerns:

- Next.js app has many admin and creator surfaces with broad client interactions
- GameGrid uses React + lazy loading but is very large
- some server pages directly touch Prisma, which can prevent clearer cache boundaries

No single React tree looked catastrophically wrong from the sampled files, but the larger issue is route breadth, not one giant component.

### Database query risks

1. Feed candidate queries
   - include multiple joins and counts
   - then re-rank in application memory

2. Watch detail queries
   - show -> seasons -> episodes nested include

3. Party routes
   - frequent read/write chatter between Prisma and Redis

4. Studio worker
   - many status transitions and find/create/update operations

### Top scalability risks

1. `apps/web` remaining the execution home for nearly every platform concern
2. local-memory rate limiting instead of distributed enforcement
3. feed and shorts ranking done inside request handlers
4. growing write volume in shared Postgres without service partitioning
5. high documentation/spec surface creating maintenance lag and false confidence

## 8. Code Quality Review

### Maintainability

Overall rating: Mixed

Strong areas:

- shared packages are small and readable
- Prisma schema is coherent
- route handlers are generally direct and understandable
- docs and runbooks are rich
- testing discipline exists

Weak areas:

- `apps/web/lib` is too large and conceptually overloaded
- many advanced modules are pseudo-implementations rather than runtime-connected systems
- product domains are not cleanly separated
- monorepo contains both high-fidelity production code and speculative modules with similar naming weight

### Readability

Most sampled code is readable and pragmatic. The main readability problem is not code style; it is signal-to-noise ratio across the repo.

The repository makes it hard to answer:

- what is production runtime?
- what is simulation?
- what is policy?
- what is future intent?

without reading multiple files and docs.

### Modularity

Package-level modularity is decent.

Application-level modularity in `apps/web` is weak. The shell acts as:

- web frontend
- API gateway
- business logic layer
- admin control plane
- policy runtime host

That is too much for one app.

### Naming consistency

Generally good in the shared platform schema and route structure.

Inconsistencies:

- some products use plain names (`what2watch`, `ambush-soccer`), others use scoped package names
- role and permission semantics are partially normalized, partially string-based
- some docs refer to systems more maturely than code does

### Technical debt patterns

- stubs and placeholders in important user flows
- duplicated spec and implementation layers
- coarse authorization beneath sophisticated governance branding
- Next.js app accumulating service responsibilities
- package encapsulation bypass in at least one scheduler import

## 9. Security Analysis

### Authentication risks

#### Email-only credentials auth

`apps/web/lib/auth.ts` authorizes by email only when dev credentials auth is allowed.

Assessment:

- acceptable for local/dev
- dangerous if misconfigured in production

Mitigation present:

- `assertAuthSecurityConfig()` and production gating

Residual risk:

- still relies on environment correctness, not strong auth design

#### Session and RBAC model

RBAC is shallow in runtime:

- admin access is mostly `role === "admin"` or permission contains `admin:*`
- many finer-grained permission concepts exist in policy docs but not runtime enforcement

### Authorization weaknesses

1. Runtime authorization sophistication lags governance sophistication.
2. Some creator/studio surfaces explicitly document TODOs around RBAC hardening.
3. Role string on `User` is not FK-backed.

### Unsafe input handling

Mostly decent:

- extensive use of `zod`
- upload filename sanitization
- public URL and key validation on upload finalization

Remaining concerns:

- `app/api/storage/upload/route.ts` accepts raw data URLs and uploads directly, which could become an abuse vector without stronger size/content inspection
- many JSON blobs are accepted into DB models, increasing trust in application-layer validation

### Dependency and platform security posture

Good signals:

- supply-chain check script exists
- key-rotation and governance checks exist
- upload endpoints verify size/type and namespace
- security headers are set in middleware

Weak signals:

- no evidence of hardened secret management beyond env discipline
- voice and monetization are only partially productionized
- no strong platform-wide distributed rate limit

### Insecure API patterns

#### Purchase stub

`/api/shorts/[id]/purchase` writes purchase records without actual payment processing.

This is fine for scaffolding and unacceptable for real monetization.

#### In-memory rate limits

This is a security and abuse issue, not just a scaling issue.

#### Internal admin sprawl

A very large `/api/admin/*` surface inside the main web app increases:

- accidental exposure risk
- audit complexity
- test matrix size

### Security improvement suggestions

1. Replace dev credentials auth with real identity federation before any production rollout.
2. Move rate limiting to Redis or edge gateway enforcement.
3. Add schema-level uniqueness for purchase/access records.
4. Strengthen authorization from coarse admin gating to capability-level checks.
5. Add signed payment-backed entitlements for premium content.
6. Introduce stronger upload malware/scan pipeline if assets become public.

## 10. Product System Map

### Watch

- lean-back streaming
- live channels
- profiles and kids mode
- premium flags and starter entitlements
- admin scheduling

### Party

- shared rooms around watch content
- seats and room presence
- playlist co-curation
- voice scaffolding
- minigame party mode

### Studio

- creator projects
- uploads
- asynchronous rendering
- remix/jobs/templates
- publish to shorts
- admin asset cleanup

### Shorts

- short-form feed entries
- premium post support
- purchases and access checks
- meme conversion path
- feed integration

### Games

- platform-native minigame generation in `apps/web`
- external game portal integration through GameGrid
- standalone first-party style games via PixelBrawl and Ambush Soccer

### Creator tools

- creator identity
- portability export/import
- template marketplace scaffolding
- progression and revenue attribution

### Social features

- wall posts
- likes/comments/shares/reports
- anonymous identity
- moderation and feature/pin/hide controls
- party co-presence

### How they interact

```text
Studio -> ShortPost -> FeedPost -> Home/Shorts
Watch -> FeedPost / Party playlist / Live channels
Party -> Watch + Voice + Minigames
Games -> platform directory + game feed entries + party minigames
Admin -> all systems
Creator identity/progression -> Studio + Shorts monetization
```

## 11. User Journey Analysis

### Viewer flow

1. open platform shell
2. browse home/watch/shorts/apps
3. sign in if needed
4. pick watch profile
5. watch content, save to list, join party, like/share/report content

Friction points:

- profile gating can feel abrupt
- movies surface is still stubbed
- premium gating is conceptual, not commerce-grade
- external app launches may break unified feel

### Creator flow

1. create project in studio
2. upload assets
3. enqueue render job
4. wait for worker processing
5. publish to shorts
6. potentially accrue revenue attribution/progression

Friction points:

- operationally dependent on Redis + S3 + worker + ffmpeg
- render pipeline is more capable than the surrounding creator UX maturity
- monetization path is not real checkout

### Admin flow

1. sign in as admin
2. manage shows/seasons/episodes/users/roles
3. review feed reports and assets
4. run scheduler and ops workflows
5. inspect audit or policy outputs

Friction points:

- admin surface is very large
- many routes are policy evaluators rather than integrated operational tooling
- permission model is simpler than the UI surface implies

### Game player flow

Two variants:

1. platform-native
   - browse `/games`
   - play or generate minigames

2. external integrated
   - open GameGrid or PixelBrawl via shell

Friction points:

- game experiences are split across multiple product stacks
- user progression and identity are not obviously unified across all game products

## 12. Feature Gap Analysis

### Missing or underbuilt capabilities

#### Monetization

- no real payment processor integration for shorts
- no real entitlement ledger for premium watch beyond sign-in gate
- no DRM or transactional commerce

#### Creator economy

- revenue attribution exists, but settlement/payout/compliance workflow is incomplete
- marketplace features are scaffolded rather than fully productized

#### Moderation

- rule-based moderation exists
- deeper moderation infrastructure, reviewer workflows, and ML/human escalation are not operationally complete

#### Analytics

- `PlatformEvent` exists, but analytics stack is light
- no clear warehouse or robust metrics pipeline

#### Discovery

- feed ranking is heuristic
- no strong follow graph, recommendation graph, or personalization service

#### Scalability architecture

- no service partitioning for major domains
- no distributed rate limiting
- no read-model or search architecture for feed/watch/social beyond direct DB access

#### Operational health

- worker HTTP health probe still TODO
- many governance controls exist as validation artifacts, not full automation loops

## 13. Technical Debt Map

| Debt item | Why it exists | Risk | Suggested fix |
| --- | --- | --- | --- |
| `apps/web` domain sprawl | platform grew by accretion inside one shell | High | split by domain packages/services |
| `apps/web/lib` as mixed runtime/spec folder | fast iteration and document mirroring | High | separate runtime libraries from policy/spec modules |
| in-memory rate limiting | easy MVP implementation | High | Redis-backed or gateway-backed limiter |
| purchase stub for monetization | product scaffold before payments | High | integrate real checkout and entitlements |
| weak role normalization | simple MVP auth model | Medium | FK-backed role mapping or richer ACL store |
| direct scheduler import into `agent-manager/src` | convenience shortcut | Medium | expose stable package API |
| duplicated docs and TypeScript policy modules | contract-first development | Medium | generate one from the other or define canonical source |
| large admin API surface in main app | control plane co-located with shell | Medium | isolate admin backend or domain services |
| placeholder content in watch/movies/studio | unfinished product layers | Medium | close feature gaps or clearly hide incomplete surfaces |

## 14. Improvement Opportunities

### Architecture

Highest ROI:

1. carve `apps/web` into domain modules:
   - identity
   - watch
   - feed
   - party
   - creator
   - governance runtime

2. move advanced policy/XR/autonomy evaluators into a distinct package

3. create explicit service boundaries for:
   - feed/discovery
   - creator pipeline
   - party/realtime

### Performance

1. move feed ranking toward precomputed scores or cached read models
2. index hot feed and monetization paths
3. batch scheduler writes
4. replace in-process rate limiting

### Security

1. real auth federation
2. distributed rate limits
3. payment-backed entitlements
4. stricter schema constraints
5. stronger admin permission granularity

### Developer experience

1. classify modules as `production`, `experimental`, or `spec-runtime`
2. auto-generate code/doc registries from a canonical source
3. add workspace-level architecture visualization
4. reduce ambiguity around standalone vs integrated apps

### Product capability

1. complete premium commerce
2. unify game identity/progression
3. deepen creator marketplace and moderation
4. build real cross-app discovery and notification graph

## 15. Prioritized Roadmap

### Short term (0-3 months)

Technical:

- implement Redis-backed rate limiting
- normalize high-risk DB constraints and indexes
- harden RBAC on studio/admin surfaces
- extract shared platform-core auth and policy modules
- close scheduler import boundary violation

Product:

- complete real premium shorts checkout and entitlements
- finish watch movies/catalog gap or hide stubbed surfaces
- improve party host migration and voice reliability

### Medium term (3-12 months)

Technical:

- split `apps/web` into clearer domain modules or service adapters
- introduce feed/discovery read models
- add stronger observability and worker health endpoints
- establish event contracts across watch/feed/studio/party

Product:

- unify creator identity, progression, and monetization
- deepen social graph and notifications
- improve cross-app platform identity between shell, games, and external products
- graduate external app integration from iframe/launcher pattern to deeper platform APIs

### Long term (1-3 years)

Technical:

- move from monolithic shell backend to domain services where justified
- establish robust event streaming, analytics, and warehouse pipelines
- operationalize governance artifacts into real automated control systems

Product:

- creator marketplace and payout infrastructure
- mature party into live shared experiences and co-play
- unify content distribution across watch, shorts, games, and news
- bring AI-assisted creation and moderation into production-grade workflows

## 16. Platform Future Vision

### How ILLUVRSE could become world-class

#### Creator economy

Evolve from:

- project -> short -> purchase

to:

- creator identity -> rights/provenance -> template marketplace -> remix economy -> payouts -> governance

The schema already points in this direction.

#### Social systems

Evolve from:

- wall + comments + party rooms

to:

- identity graph
- follows
- collaborative viewing
- creator communities
- watch/game party persistence

#### Gaming infrastructure

Evolve from:

- game launchers + UGC minigames + standalone games

to:

- unified game identity
- progression
- matchmaking
- shared telemetry
- monetization and creator-made game publishing

#### Content distribution

Evolve from:

- internal watch/feed/shorts silos

to:

- one distribution graph where studio outputs can become shorts, watch extras, party assets, and social posts automatically

#### AI integration

The repo already wants AI everywhere, but the right move is not more policy files. The right move is selective productionization:

1. creator assist
   - scripting
   - clip detection
   - thumbnailing
   - moderation assist

2. discovery assist
   - personalized feed and watch recommendations

3. operations assist
   - anomaly detection
   - scheduling
   - incident summarization

4. governance assist
   - evidence generation
   - explainability bundles
   - certification preflight

### Final strategic judgment

ILLUVRSE has the bones of a serious platform:

- a unified shell
- a meaningful content and creator data model
- async media production
- realtime party infrastructure
- integrated external products
- strong operational intent

What it lacks is separation between:

- real runtime infrastructure
- speculative strategic architecture
- scaffolding vs production

If the team narrows focus to a few high-conviction loops:

- watch
- party
- studio
- shorts/feed
- creator monetization

and hardens those before expanding the autonomy/XR/governance surface further, the platform can evolve from ambitious monorepo to defensible entertainment operating system.

## Appendix: Measured Repo Signals

- `apps/web` pages: 67
- `apps/web` API route handlers: 367
- `apps/web` unit tests: 291
- shared DB migrations: 29
- boundary check status: PASS (`2086` files scanned)
- governance check status: PASS
- migration lint status: PASS

## Appendix: Key Findings Summary

1. The real platform is `apps/web` plus a small set of shared packages.
2. `packages/db` is the central product data backbone and is broadly well structured.
3. `packages/world-state` is one of the strongest architectural choices in the repo.
4. Studio is the most coherent end-to-end subsystem.
5. News is the most independently mature side product.
6. The main architectural weakness is overconcentration in `apps/web`.
7. The main product weakness is scaffolding where commerce, moderation, and cross-app identity should be production systems.
8. The main organizational weakness is blending strategic architecture and implemented runtime into one undifferentiated code surface.
