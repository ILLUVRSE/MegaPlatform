# Pool

## Controls
- Drag from cue ball to aim.
- Pull back distance sets power; release to shoot.
- Aim line is visible while aiming.
- Ghost ball preview is enabled by default and can be toggled.
- Spin control: tap cue ball to open spin widget, drag marker for english.
- Ball-in-hand: drag cue ball to reposition when allowed.

## Modes
- `8-ball` (default): standard solids/stripes assignment, 8-ball finish.
- `9-ball`: lowest ball first, legal 9-ball pocket wins immediately.
- `Trick Shots`: data-driven scenarios from `src/content/pool-trickshots.json` with attempt tracking.
- `Practice`: free cue-ball placement and rack reset button.

## Fouls And Toggles
- Scratch gives opponent ball-in-hand.
- Illegal first contact is a foul.
- `Strict Rules` toggle adds no-rail-after-contact foul (if no ball pocketed).
- `Ghost Ball`, `Spin Control`, and `Shot Timer` toggles are available pre-match.

## Trick Shot JSON Format
Each item in `src/content/pool-trickshots.json` uses:

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "variant": "eight_ball | nine_ball",
  "mustUseSpin": true,
  "balls": [{ "number": 0, "x": 320, "y": 500 }],
  "goal": { "type": "pocket_ball", "ballNumber": 1, "pocketId": "TR" }
}
```

`mustUseSpin` and `goal.pocketId` are optional.
