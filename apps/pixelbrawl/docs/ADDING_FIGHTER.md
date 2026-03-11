# Adding a New Fighter

## 1) Create the fighter folder

```
src/assets/fighters/<id>/
```

Example:

```
src/assets/fighters/zeno/
```

## 2) Add portrait (optional)

```
src/assets/fighters/<id>/portrait.png
```

If missing, a placeholder portrait will be generated automatically.

## 3) Add animation assets

Preferred:

```
src/assets/fighters/<id>/atlas.png
src/assets/fighters/<id>/atlas.json
```

Acceptable:

```
src/assets/fighters/<id>/sheet.png
src/assets/fighters/<id>/sheet.json
```

Animation keys required for every fighter:

- `idle`
- `walk`
- `crouch`
- `jump`
- `hit`
- `block`
- `attack_hit`
- `attack_kick`
- `attack_power`
- `knockdown`
- `ko`

## 4) Register fighter in the roster

Edit:

```
src/engine/roster/roster.json
```

Add an entry under `fighters`:

```json
"zeno": {
  "displayName": "ZENO",
  "tag": "Trick",
  "accent": { "primary": "#88e0ff", "secondary": "#c7f4ff" },
  "portrait": "src/assets/fighters/zeno/portrait.png",
  "assets": {
    "type": "atlas",
    "image": "src/assets/fighters/zeno/atlas.png",
    "data": "src/assets/fighters/zeno/atlas.json"
  },
  "render": {
    "origin": { "x": 0.5, "y": 1.0 },
    "baseScale": 1.0,
    "offset": { "x": 0, "y": 0 }
  },
  "stats": {
    "walkSpeedMul": 1.0,
    "damageMul": 1.0,
    "hpMul": 1.0,
    "throwMul": 1.0,
    "recoveryMul": 1.0
  },
  "enabled": true
}
```

Then add the ID to the `slots` array and remove it from `locked` when ready.

## 5) Optional render offsets

Use `render.origin`, `render.offset`, and `render.baseScale` to align sprites without changing hitboxes. Offsets are visual-only.

## 6) Enable the fighter

Set `enabled: true` and ensure the ID is not in the `locked` list.
