# Table Tennis

## Controls
- Tap `Serve`, then swipe up to serve.
- During rallies, swipe to return.
- Swipe direction controls shot direction.
- Swipe speed controls shot speed.
- Upward curve/top component adds topspin.
- Downward curve/bottom component adds backspin.
- Spin feedback appears as a brief toast after contact.

## Assist And Sensitivity
- `Assist`: widens paddle hit window, stabilizes aim, and softens spin sensitivity.
- `Spin Assist`: further reduces spin intensity for beginner control.
- `Sensitivity`: `low`, `medium`, `high` adjust swipe-to-speed mapping.
- `Show Trajectory`: optional projected ball path visualization.
- `Visuals`: switch between `Polished` and `Classic` rendering for quick A/B checks.
- `Ball Trail`: enable subtle high-speed trail for the ball.
- `Reset Serve Tutorial`: shows the first-serve coachmark overlay again.

## Serve And Scoring
- Standard table tennis game scoring: first to 11, win by 2.
- Serve alternates every 2 points.
- At deuce (10-10+), serve alternates every point.
- Best-of-3 match format supported (first to 2 games).
- Serve flow is always `Tap Serve` -> `Swipe`.

## Modes
- `Quick Match`: single game to 11 vs AI.
- `Best of 3`: match to 2 games vs AI.
- `Target Practice`: 20-ball drill, score by hitting marked targets.

## Visual System
- Theme constants live in `src/games/table-tennis/visualTheme.ts`.
- Main knobs:
  - `background.*`: deep navy backdrop values.
  - `table.*`: material table gradient, line width/alpha, and geometry.
  - `net.*`: center strip color/alpha/shadow.
  - `paddle.*` and `ball.*`: lighting, rim, and shadow cues.
  - `ui.*`: HUD text, chip, and unified button colors.
- Texture helpers:
  - `ensureNoiseTexture`: subtle table grain overlay (2-4% look via low alpha tile layer).
  - `ensureVignetteTexture`: seated/inner-shadow feel on the table.
  - `ensurePaddleTexture`: rounded capsule paddle textures with highlight + rim.
- Runtime toggles:
  - `Visuals: Polished/Classic` to compare old/new rendering.
  - `Ball Trail` for optional speed trail effect.

## Premium Visual Polish
- Premium tuning lives in `src/games/table-tennis/visualTheme.ts`:
  - `lighting.*`: directional table light overlay strengths.
  - `net.*`: line thickness + shadow/highlight visibility.
  - `ball.*`: dynamic shadow alpha near/far from table.
  - `vfx.*`: ring/speck counts and durations.
  - `animation.*`: score pop timing and scale.
- Render path is implemented in:
  - `src/games/table-tennis/scene.ts` (single-player + HUD + coachmark)
  - `src/games/table-tennis/multiplayerScene.ts` (multiplayer parity)
- Visual debug toggles (settings menu):
  - `Debug Light` enables/disables directional light overlays.
  - `Debug VFX` enables/disables impact ring/speck and squash feedback.
  - `Debug Vignette` enables/disables table/outer vignette framing.
- Tweaking guidance:
  - If table looks too glossy, lower `lighting.directionalLinearAlpha` and `lighting.directionalSpecularAlpha`.
  - If net is too strong, lower `net.alpha` and `net.highlightAlpha`.
  - If impact feedback is too busy, reduce `vfx.speckCount` or `vfx.ringAlpha`.
  - If score pop feels aggressive, reduce `animation.scorePopScale`.

## AI Difficulty
- `Easy`: slower reactions, higher miss chance, limited spin control.
- `Medium`: balanced reactions and mixed shot selection.
- `Hard`: better anticipation, stronger spin/placement, still missable.
