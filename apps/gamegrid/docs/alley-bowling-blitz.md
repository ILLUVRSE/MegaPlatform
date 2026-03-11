# Alley Bowling Blitz

Alley Bowling Blitz is available at `/play/alley-bowling-blitz`.

## Controls

- Drag/swipe from the bottom of the lane toward the pins to release.
- Swipe direction sets launch angle.
- Swipe speed sets release speed.
- Swipe curve sets hook/spin (left/right break).
- Settings include `Sensitivity` (Low/Medium/High), `Spin Assist`, and `Show Guide`.

## Modes

- **Classic 10 Frames**: full bowling frame logic with strike/spare bonuses and optional Vs AI.
- **Timed Blitz (60s)**: rapid scoring mode using a documented blitz policy.
- **Challenge Ladder**: data-driven challenge set loaded from `src/content/bowling-challenges.json`.

## Timed Blitz Scoring Policy

Timed Blitz uses accelerated scoring:

- Base points: pins knocked each roll.
- Strike bonus: `+5` plus streak chain bonus.
- Spare bonus: `+2`.

This is intentionally faster than full 10-frame scoring for short-session play.

## Classic Scoring Basics

- Strike: `10 + next two rolls`.
- Spare: `10 + next one roll`.
- 10th frame grants fill balls for strike/spare outcomes.

## Challenge Ladder JSON Format

Each challenge entry must define:

- `id`, `name`, `description`
- `startingPins` (pin ids to spawn)
- `rollLimit`
- `goal` object with supported goal types:
  - `strike_streak`
  - `spares_in_frames`
  - `knock_total`
  - `score_min`
  - `split_convert`

Completion is stored locally in browser storage.

## Difficulty Behavior

Vs AI difficulty changes release consistency and shot quality:

- `easy`: wider aim variance and less stable spin.
- `medium`: balanced noise and pace.
- `hard`: tighter aim, more reliable speed/spin control.
