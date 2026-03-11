# Hangar UX

## Flow

- Each slot card is tappable (`Weapon 1`, `Weapon 2`, `Defense 1`, `Defense 2`, `Utility`, `Rig`).
- Tapping opens a module picker overlay filtered to that slot.
- Picker supports sorting by:
- `Rarity`
- `Power`
- `DPS`
- `Heat`

## Equipping Rules

- Equip: tap row in picker.
- Unequip: keyboard `U` shortcut while picker is open (desktop helper).
- Build validity is evaluated continuously using `buildLaunchValidation()`.

## Validation Rules

- Must have a primary weapon equipped.
- Total module power must not exceed ship power budget.
- Invalid fits are allowed to preview and save, but mission launch is blocked with warning.

## Compare View

Picker displays current vs candidate delta summary:

- Power delta
- Shield/Hull delta
- Aggregate weapon damage delta

## Risk Indicator

Overview card includes heat risk (`LOW`, `MED`, `HIGH`) from sustained heat profile vs heat capacity.
