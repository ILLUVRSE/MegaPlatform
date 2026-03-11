# PixelPuck Ship Checklist (AddictingGames HTML5)

## Status
- Overall: NOT READY

## Top 10 Blockers (Current)
1. No documented memory growth check after 10 rematches (requirement).
2. No documented performance measurements (fps/load/memory).
3. No recorded zero-console-error run in a real browser.
4. No submission assets generated for PixelPuck (thumbnail/video/submission.json/zip).
5. No documented deterministic input edge-case tests on mobile (multi-touch, pointer cancel).
6. No explicit mobile tutorial overlay inside game scene (portal How-To exists, but not contextual).
7. Portal vs in-game pause behavior not validated in device testing.
8. Safe-area HUD not device-verified on notch devices (implemented).
9. Portal HUD sync not device-verified (implemented).
10. Build/shipcheck not run for PixelPuck.

## Core Requirements
- Responsive resize (landscape/portrait): PARTIAL
  - Evidence: Contain scaling used in portal; safe-area offsets added to PixelPuck HUD. Needs device validation.
- Mobile touch controls: PASS (provisional)
  - Evidence: Pointer input logic in `src/games/pixelpuck/input.ts`. Needs device validation.
- No outbound links: PASS (provisional)
  - Evidence: No links in PixelPuck scene; needs runtime audit.
- No 3rd-party tracking: PASS (provisional)
  - Evidence: No SDKs in PixelPuck; needs repo-wide scan.
- Playable URL + iframe/zip: FAIL
  - Evidence: Not packaged.

## UX / Accessibility
- Clear onboarding (tutorial or first-run overlay): PARTIAL
  - Evidence: Portal “How to Play” exists; in-game tutorial not contextual.
- Mute toggle, no autoplay before interaction: PASS (provisional)
  - Evidence: Audio gate in portal; shared audio manager only unlocks on gesture; engine mute sets global mute.
- Readable UI on phones / safe areas: PARTIAL
  - Evidence: Safe-area HUD offsets implemented in PixelPuck; needs device validation.

## Stability
- Zero console errors: FAIL
  - Evidence: Not tested in browser session.
- Clean reset / replay: PARTIAL
  - Evidence: Shared reset wired to portal rematch; memory growth after 10 rematches not yet measured.
- Deterministic input: PARTIAL
  - Evidence: Single-pointer logic; needs multi-touch/pointer-cancel validation.

## Performance Budget (Targets + Measurements)
- Target FPS: 60 (desktop), 45+ (mobile)
- Load time target: < 3s on mid-range mobile
- Memory target: < 200 MB total, < 60 MB per game scene
- Measurements: Not captured yet (need profiler + runtime sampling)

## Evidence Log (Screens/Logs)
- Tests: `npm test -- pixelpuck`
  - Result: 4 test files, 5 tests passed.
  - Warnings: React Router future flag warnings in `scene.integration.test.tsx`.
