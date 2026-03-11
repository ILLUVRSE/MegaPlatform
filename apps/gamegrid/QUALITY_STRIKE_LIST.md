# GameGrid Quality Strike List

## Repo Map
### Games (folder -> main scene entrypoint)
- pixelpuck -> src/games/pixelpuck/scene.ts
- throw-darts -> src/games/throw-darts/scene.ts
- minigolf -> src/games/minigolf/scene.ts
- freethrow-frenzy -> src/games/freethrow-frenzy/scene.ts
- homerun-derby -> src/games/homerun-derby/scene.ts
- table-tennis -> src/games/table-tennis/scene.ts (multiplayer: src/games/table-tennis/multiplayerScene.ts)
- foosball -> src/games/foosball/scene.ts
- pool -> src/games/pool/scene.ts
- card-table -> src/games/card-table/scene.ts
- penalty-kick-showdown -> src/games/penalty-kick-showdown/scene.ts
- goalie-gauntlet -> src/games/goalie-gauntlet/scene.ts
- alley-bowling-blitz -> src/games/alley-bowling-blitz/scene.ts
- ozark-fishing -> src/games/ozark-fishing/scene.ts
- starlight-chronicles -> src/games/starlight-chronicles/scene.ts (multiplayer: src/games/starlight-chronicles/multiplayerScene.ts)
- oz-chronicle (Chronicles of the Silver Road) -> src/games/oz-chronicle/scene.ts
- wheel-of-fortune -> src/games/wheel-of-fortune/scene.ts
- checkers -> src/games/checkers/scene.ts
- battleship -> src/games/battleship/scene.ts

### Shared UI components
- src/components/GlobalLoadingScreen.tsx
- src/components/HowToPlayOverlay.tsx
- src/components/Icon.tsx
- src/components/PerfDiagnostics.tsx
- src/components/PortalOverlay.tsx
- src/components/SettingsModal.tsx
- src/styles.css

### Shared systems/utilities
- src/systems/audioManager.ts
- src/systems/audioUnlock.ts
- src/systems/gameplayComfort.ts
- src/systems/safeArea.ts
- src/systems/scaleManager.ts
- src/systems/settingsContext.tsx
- src/systems/themes.ts
- src/game/GameContainer.tsx
- src/game/engine.ts
- src/game/createGameShell.ts

### Multiplayer adapters
- src/mp/adapterMultiplayerScene.ts
- src/mp/adapters/* (see src/mp/adapters/index.ts)
- src/mp/protocol.ts
- src/mp/room.ts
- src/mp/session.ts
- src/mp/transport.ts

## Platform Checklist (Phase 1)
- [x] Unified input layer with deadzone, smoothing, sensitivity, pointer capture
- [x] Standard overlays: Loading, HowToPlay, Pause, Results, Error
- [x] Standard button component + typography tokens + layout spacing
- [x] Audio manager improvements: mute toggles + mobile unlock handling
- [x] Perf sampling (dev-only) + asset load instrumentation + cleanup helper
- [x] Accessibility: keyboard fallback, reduced motion, contrast-safe text
- [x] Analytics hooks (dev-only interface)

## Per-Game Checklist (Phase 2)
### PixelPuck
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Throw Darts
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Minigolf
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Freethrow Frenzy
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Homerun Derby
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Table Tennis
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Foosball
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Pool
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Card Table
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [ ] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Penalty Kick Showdown
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Goalie Gauntlet
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [ ] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Alley Bowling Blitz
- [x] Boot/smoke test (integration)
- [ ] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [ ] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [ ] Tests updated
- [ ] Logged completion

### Ozark Fishing
- [x] Boot/smoke test (integration)
- [x] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [x] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [x] Tests updated
- [x] Logged completion

### Starlight Chronicles
- [x] Boot/smoke test (integration)
- [x] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [x] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [x] Tests updated
- [x] Logged completion

### Oz Chronicle (Chronicles of the Silver Road)
- [x] Boot/smoke test (integration)
- [x] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [x] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [x] Tests updated
- [x] Logged completion

### Wheel of Fortune
- [x] Boot/smoke test (integration)
- [x] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [x] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [x] Tests updated
- [x] Logged completion

### Checkers
- [x] Boot/smoke test (integration)
- [x] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [x] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [x] Tests updated
- [x] Logged completion

### Battleship
- [x] Boot/smoke test (integration)
- [x] Remove console errors/warnings
- [x] Mobile controls tuned
- [x] Game feel polish
- [x] HowToPlay + Pause + Results
- [x] Performance + cleanup
- [x] Standardize shared UI/input/audio
- [x] Tests updated
- [x] Logged completion

## Professional Gate Checklists
Authoritative per-game criteria live in docs/pro-gate/.
- docs/pro-gate/README.md (universal bar)
- docs/pro-gate/homerun-derby.md
- docs/pro-gate/minigolf.md
- docs/pro-gate/goalie-gauntlet.md

## Multiplayer Hardening (Phase 3)
- [x] Added adapter input validation helpers (envelopes, enums, booleans, numbers, strings)
- [x] Hardened adapters with clamps/sanitization on remote inputs
- [x] Added goalie-gauntlet action sanitization and zone validation
- [x] Expanded room tests for host promotion and ready reset on disconnect

## Bugs Found (Phase 0)
- [x] React Router future-flag warnings during integration tests (v7_startTransition, v7_relativeSplatPath).
- [x] Integration tests log "Game boot failed: TypeError: currentEngine.init is not a function" even though tests pass.
- [ ] Build warning: large chunk size (audioManager bundle > 500 kB).

## Notes
- [x] Doom Ball removed from repository per product decision; adapters/tests/content cleaned up.
