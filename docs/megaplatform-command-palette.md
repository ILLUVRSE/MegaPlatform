# Megaplatform Command Palette

Phase 305 adds a shared command launcher for shell navigation and session-aware actions.

## Runtime

- Command registry: `apps/web/lib/platformCommands.ts`
- API: `GET /api/platform/commands`
- UI: `apps/web/components/PlatformCommandLauncher.tsx`

## Behavior

Commands are filtered by identity and include session-resume shortcuts derived from the session graph.
