# PixelPuck QA Test Plan

## Scope
- Single-player PixelPuck (AI opponent).
- Mobile + desktop inputs.
- Portal integration (pause, mute, How To Play, rematch).

## Manual Test Matrix
- Devices: iPhone (Safari), Android (Chrome), Desktop (Chrome/Firefox).
- Orientations: Portrait + Landscape.
- Input: touch, mouse, multi-touch stress, pointer cancel.

## Core Gameplay Tests
1. Start match from menu (all modes) → puck launches after countdown.
2. Goal detection at both ends (top/bottom).
3. Sudden death triggers when tied in first-to mode.
4. Timer countdown ends match in timed mode.
5. Practice mode never ends by score.
6. Power Smash triggers after fast swipe, cooldown bar refills.
7. AI difficulty changes observable (speed/accuracy).

## UX & Overlay Tests
1. Portal pause button pauses game; resume continues correctly.
2. In-game pause button stays in sync with portal pause.
3. How To Play overlay opens/closes without breaking input.
4. Settings modal mute toggle stops all audio.
5. Audio gate blocks playback until first tap.

## Responsiveness & Safe Area
1. Resize window; game remains centered with correct aspect.
2. Notch devices: HUD doesn’t collide with safe areas.
3. Minimum width/height still playable with readable UI.

## Stability/Reset
1. Play 5 matches consecutively; no crashes or memory growth.
2. Rematch from end screen resets score/timer/puck.
3. Portal rematch triggers game reset (needs implementation).

## Performance
1. Maintain 60fps desktop, 45+ mobile.
2. No spikes > 40ms frame time during collisions.

## Automated Tests (Existing)
- `src/games/pixelpuck/rink.test.ts`
- `src/games/pixelpuck/rules.test.ts`
- `src/games/pixelpuck/scene.integration.test.tsx`

## Gaps / To Add
- Input edge-case tests (pointer cancel, multi-touch)
- Performance smoke test / baseline metrics
