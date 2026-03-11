# Foosball

## Controls
- Default: active rod auto-selects by ball x-zone (`Goalkeeper`, `Defense`, `Midfield`, `Strikers`).
- Swipe vertically to move the active rod.
- Tap/click any rod to manually override selection for 2 seconds or until the next kick.
- Toggle `Auto-Select Rod` off to require manual rod control.
- Tap or flick to kick.
- Faster flicks produce stronger shots.
- `Shoot Assist` improves contact reliability for beginners.

## Modes
- `First to 5`: first side to 5 goals wins.
- `Timed`: default 90s. If tied at time expiry, match enters sudden death and next goal wins.
- `Training`: run drills from `src/content/foosball-drills.json` with local completion marks.

## Training Drills JSON Format
Each drill entry supports:
- `id`, `title`, `instructions`
- `goal`: `{ type: "score" | "block" | "pass_chain", target: number }`
- `timeLimitSec` (optional)
- `startBall`: `{ x, y, vx, vy }`
- `activeRods`: list of enabled rod roles
- `lockedRods`: list of locked rod roles

## AI Difficulty
- `Easy`: slower reactions, lower speed, weaker/less accurate shots.
- `Medium`: balanced movement, occasional passing, moderate shot power.
- `Hard`: faster defense and stronger offense with purposeful pass/shot mix, still constrained by rod speed and reaction windows.
