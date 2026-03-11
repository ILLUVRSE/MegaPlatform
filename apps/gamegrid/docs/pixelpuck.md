# PixelPuck

## Controls
- Touch or mouse drag moves the player paddle.
- Paddle is constrained to the bottom half.
- Pointer capture keeps drag control until pointer release.
- Sensitivity options: low, medium, high.

## Modes
- First to 7 (default): first side reaching 7 wins.
- Timed (90s): highest score at time end wins.
- Practice: no AI scoring; puck resets after goals.

## Tie-break policy
- Timed mode ties enter sudden death: next goal wins.

## Assist and Power Smash
- Assist toggle adds mild clamp and aim damping to reduce overshoot.
- Power Smash toggle enables cooldown ability:
  - Triggered by quick flick while dragging.
  - Adds stronger impact for a short window.
  - Cooldown indicator shown in match UI.

## Rink variants
Rinks are data-driven in `src/content/pixelpuck-rinks.json`.
Included variants:
- `classic`
- `narrow-goals`
- `obstacles`

JSON schema fields:
- `id`, `name`
- `bounds` (`x`, `y`, `width`, `height`)
- `goals.top` and `goals.bottom` (`x`, `width`, `lineY`)
- `obstacles` array (circle/rect)
