# Platform Event Taxonomy (Phase 22)

Canonical event taxonomy for cross-module telemetry.

## Source of Truth
- `apps/web/lib/platformEvents.ts`

## Event Name Set

Platform navigation/app-open events:
- `nav_click`
- `module_open`
- `module_open_direct`

Games ecosystem events:
- `catalog_view`
- `game_open`
- `game_open_direct`
- `embed_loaded`
- `creator_publish`

## Surface Set

Platform shell surfaces:
- `header_desktop`
- `header_mobile`
- `home_hub`
- `apps_directory`
- `embedded_app`

Games surfaces:
- `games_home`
- `games_catalog`
- `games_detail`
- `games_embed`
- `games_create`

## Validation and Insertion

Validation/parsing helpers:
- `parsePlatformAppEventPayload`
- `parseGamesEventPayload`

Storage helper:
- `insertPlatformEvent`

Derived helpers:
- `resolveGamesModuleName`
- `resolveGamesHref`

## Modules Using This Taxonomy

1. Platform telemetry ingestion API:
   - `apps/web/app/api/platform/events/route.ts`
2. Games telemetry ingestion API:
   - `apps/web/app/api/games/telemetry/route.ts`
3. Growth analytics funnel query constants:
   - `apps/web/app/api/admin/growth/recommendations/route.ts`
4. Client telemetry emitters (typed payload contracts):
   - `apps/web/lib/platformTelemetry.ts`
   - `apps/web/lib/gamesTelemetry.ts`
