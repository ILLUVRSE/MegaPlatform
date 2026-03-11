# GameGrid Builder (Create Your Own Game)

GameGrid is the creator-facing mode for building 30-second minigames without code. Players assemble a `MinigameSpec` using templates, objectives, pacing, modifiers, and themes. The runtime executes these specs with strict validation + auto-fix at the API boundary.

## What It Is
- `/games/create` is the builder UI for composing a game.
- `/games/my` lists your drafts and published games.
- `/games/community` shows published games.
- `/games/user/[id]` plays a saved/published GameGrid spec.
- `/games/party?gamegridId=[id]` loads a published GameGrid spec into local party mode.

GameGrid saves `UserGame` records to the database and keeps specs deterministic via a seed.
Drafts auto-save on idle and each save creates a version snapshot in `UserGameVersion`.

## UI → Spec Mapping
The builder maps UI controls to `MinigameSpec` fields using `apps/web/lib/minigame/gamegrid.ts`.

- Template Picker
  - Sets `templateId` and uses template `buildSpec()` defaults.
- Objectives
  - Win/lose options adjust `winCondition`, `loseCondition`, and template params (e.g. `targetCount`, `bricksToClear`).
- Difficulty Preset
  - Controls the base template difficulty input (easy/normal/hard).
- Ramp Slider
  - Scales pacing-related params (spawn rates, speeds, target sizes) within `TEMPLATE_PARAM_RANGES`.
- Modifiers
  - Applies safe modifiers (max 3) and updates params when a modifier changes a numeric value.
- Theme / Skin
  - Selects a palette from `THEME_PALETTES` and writes to `spec.theme`.
- Title
  - Updates `spec.title`.
- Preset Packs
  - “Chill / Balanced / Sweat” quickly apply difficulty + ramp defaults (and safe modifier hints).

## Validation + Auto-Fix
All GameGrid API routes validate + auto-fix specs before saving or publishing.

Rules live in:
- `apps/web/lib/minigame/spec.ts` (validation)
- `apps/web/lib/minigame/autofix.ts` (auto-fix)

Auto-fix includes:
- Clamping params to `TEMPLATE_PARAM_RANGES`
- Enforcing duration = 30s and `winlose` scoring
- Ensuring template input schemas are correct
- Removing incompatible/conflicting modifiers and trimming to 3 max
- Reducing impossible quotas (target counts vs spawn cadence)
- Softening known unwinnable combos (e.g. tiny targets + jitter)

Warnings are surfaced in the builder so creators understand adjustments.

## Adding New Templates
1. Implement a new template in `apps/web/lib/minigame/templates/`.
2. Add param ranges + input schema to `apps/web/lib/minigame/spec.ts`.
3. Register in `apps/web/lib/minigame/templates/index.ts`.
4. Add template metadata + objectives in `apps/web/lib/minigame/gamegrid.ts`.
5. Update any validation/autofix rules if needed.

## Thumbnails (MVP)
GameGrid generates an SVG thumbnail from the title + palette in `generateGamegridThumbnail()` (same file as GameGrid mapping). The builder also captures the live preview canvas and sends it to the API for richer thumbnails.
