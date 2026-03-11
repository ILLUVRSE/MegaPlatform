# Economy Balance

## Reward Model

- Mission payout is computed in `src/systems/starlightLoot.ts`.
- Credits reward baseline:
- Victory: `45 + difficulty * 20`
- Defeat: `15`
- Loot bonus scales rewards by `1 + lootBonus`.
- Salvage materials baseline:
- Victory: `difficulty * 3`
- Defeat: `1`

## Pickup Economy

From `src/util/starlightConstants.ts`:

- Credit pickup: `+5`
- Duplicate pickup conversion: `+7`

## Salvage Values (Results)

From `src/systems/starlightInventory.ts`:

- Common module: `9` credits
- Rare module: `20` credits
- Epic module: `48` credits

Results allows selecting loot items for salvage before final reward commit.

## Progression Intent

- Mission 1: beatable with starter fit (`w-pulse-l1`, `d-shield-booster`, `r-radiator`).
- Mission 2: expects one or two stronger modules and perk synergy.
- Mission 3: expects tuned loadout and proper use of Blink + overheat management.

## Runaway Build Controls

- Damage reduction is capped in module composition.
- Overheat reduces practical DPS via fire-rate penalty.
- Power budget gate blocks overloaded fits from mission launch.
