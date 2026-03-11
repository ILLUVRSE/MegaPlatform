# Starlight Chronicles Economy Layer

This document covers Prompt #6 systems added to Starlight Chronicles.

## Universe Content

Files:
- `src/content/starlight-chronicles/universe.json`
- `src/content/starlight-chronicles/goods.json`
- `src/content/starlight-chronicles/market-shocks.json`

Universe model:
- Regions contain 4-8 systems.
- Each system defines:
  - `security`: `SAFE` / `LOW` / `NULL`
  - controlling faction
  - `categoryModifiers` for trade categories
  - tags such as `industrial`, `frontier`, `shrine`, `blackmarket`
  - route neighbors for deterministic pathing

## Deterministic Time Keys

Used across market/contracts/frontline:
- `dayKey` = UTC `YYYY-MM-DD`
- `weekKey` = UTC ISO week key `YYYY-Www`

All simulation uses `profile.seedBase` + deterministic hashes.

## Market Pricing

Price formula per good/system/day:

`price = basePrice * systemModifier * dayNoise * shockModifier * frontlineModifier * legalityModifier`

Inputs:
- base good definition (`basePrice`, `volatility`, legality)
- system category modifiers
- deterministic daily noise from seed + `dayKey`
- deterministic weekly shocks from seed + `weekKey`
- frontline contested status
- legality adjustments (`contraband` priced/risked differently by security tier)

## Contracts

`src/games/starlight-chronicles/economy/contracts.ts`

Contracts are generated deterministically from:
- origin system
- day key
- profile seed

Contract fields:
- origin/destination system ids
- cargo requirement (`goodId`, `quantity`)
- payout (`credits`, faction standing)
- optional module reward
- `expiryDayKey`
- smuggling flag

Contract lifecycle:
- active contracts expire by day key
- delivery resolves when current system equals destination and cargo requirement is met

## Route + Delivery Nodes

`src/games/starlight-chronicles/run/route.ts`

- Nav route uses deterministic BFS path over system neighbor graph.
- Each completed run advances one route leg.
- When en-route with active contracts, run generation can inject a `DELIVERY` node.

## Contraband + Inspections + Risk

`src/games/starlight-chronicles/world/risk.ts`

- SAFE: highest inspection risk for contraband.
- LOW: moderate inspection risk.
- NULL: no inspections.

Inspection outcomes (deterministic):
- no stop
- stop but no detection
- detection with optional bribe
- confiscation + fine + standing penalty

Modifiers:
- captain diplomacy bonus helps bribe/detection outcomes
- `hidden-compartments` utility lowers detection chance

Piracy:
- chance depends on security tier + contested frontline bonus
- ambush runs can occur in combat nodes
- flee outcomes are deterministic from seed + run index and include ship/module/crew modifiers

## Frontlines + Galactic Report

`src/games/starlight-chronicles/world/frontline.ts`

- weekly deterministic contested systems (1-2 systems/week)
- contested status affects prices and piracy pressure
- Bridge shows weekly Galactic Report summary with NEW indicator tracking

## Multiplayer Snapshot Context

Run snapshot now includes world context:
- `regionId`
- `systemId`
- `routeTargetSystemId`
- active contracts
- weekly market shock ids
- frontline contested system ids

Co-op host remains authoritative for world outcomes and sends shared snapshot state to clients.
