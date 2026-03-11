# PixelPuck Game Design + UX Spec

## Overview
Arcade air-hockey duel against AI. Short matches with selectable modes, difficulty, and rinks. Session length targets 30–90 seconds per match.

## Core Loop
1. Pick mode/difficulty/rink.
2. Play quick rally, score goals.
3. Match ends on score or timer.
4. Rematch or change settings.

## Modes
- First to 7: Standard score race.
- Timed: Countdown clock; most goals wins.
- Practice: No AI scoring; warm-up.

## Controls
- Primary: Touch/mouse pointer drag to move paddle.
- Power Smash: Fast swipe triggers short smash window (optional).
- Pause: In-game button + portal pause (to be unified).

## Scoring & Win/Lose
- Goal across opponent line = +1.
- Match winner: first-to target or highest score when timer ends.
- Sudden death when tied in score race (per rules).

## Difficulty Ramp
- AI difficulty: Easy / Medium / Hard.
- Future: Adaptive AI based on score margin and recent shots.

## UX / UI
- Top-left HUD: score, timer, info state (sudden death, practice).
- Bottom HUD: Smash cooldown bar.
- Menu panel: settings + Start Match.
- End panel: summary + rematch + change settings + back to lobby.
- Portal overlay: How to Play + pause + settings.

## Onboarding
- Portal “How to Play” overlay with controls.
- In-game: countdown and state callouts (needs contextual tips for first run).

## Accessibility
- Mute toggle available via Settings.
- Avoid autoplay before user interaction (audio gate).
- Contrast: bright text on dark rink background (needs mobile readability check).

## Audio/VFX
- SFX via tone bursts: puck hit, wall hit, goal, countdown, win.
- VFX: impact particles, subtle rink highlight.

## Economy/Progression
- None (single-session arcade).

## Technical Constraints
- Fixed 1280x720 scene scaled to viewport (letterbox).
- Target 60fps; physics step at 120Hz (fixed step).
