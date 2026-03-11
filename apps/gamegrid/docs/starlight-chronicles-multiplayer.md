# Starlight Chronicles Multiplayer Prototype

This document describes the Party Room co-op run prototype for Starlight Chronicles.

## Authority + Determinism

- host authoritative run + combat state
- deterministic map and tie-break logic from run seed
- deterministic co-op boss schedule from `scheduleSeed`
- no per-frame replication; event-log + periodic snapshots only

## Session Model

Shared snapshot includes:
- run seed/session id/phase (`lobby|map|node|combat|results|end`)
- authoritative `RunSnapshot`
- player seat/ready/spectator flags
- vote state + live tally
- shared combat state: boss hp/phase/attack id/checksum, active buffs, top contributors

## Message Types (`v:1`)

Client->Host inputs:
- `ready_status`
- `vote_cast`
- `snapshot_request`
- `host_override` (host-only)
- `dmg_intent` (low-rate boss damage intent)
- `ability_cast`
- `player_state` (`alive|downed`)

Host->Clients events:
- `coop_init`
- `coop_phase`
- `vote_resolve`
- `combat_shared_start`
- `boss_state`
- `boss_phase`
- `ability_apply`
- `combat_shared_end`
- `snapshot_resync`
- `input_rejected`
- `coop_end`

## Voting Rules

- timer: 15s
- majority wins
- ties resolved deterministically from seed + vote key + seat order
- host controls can skip timer and force first option

## Shared Boss Combat Model

Combat flow:
1. host emits `combat_shared_start` with mission seed/schedule seed/modifiers
2. clients run local combat visuals and send low-rate `dmg_intent`
3. host validates each intent (checksum + rate + DPS envelope), updates shared boss hp/phase
4. host emits `boss_state` at ~5 Hz and `boss_phase` on threshold transitions
5. host emits `combat_shared_end` with rewards/contributions and advances run

Boss phases:
- phase changes at hp thresholds around 70/40/15%
- host is source of truth; clients reconcile visuals from `boss_state`

## Support Abilities

Role abilities (host-authoritative cast/validation):
- Captain `Rally`: short team damage boost + revives downed teammates
- Science `Scan Lock`: slows attack schedule cadence (telegraph assist)
- Engineer `Patch Field`: defensive team support; grants post-fight deterministic repair
- Tactical `Overcharge`: short team damage boost

Ability rules:
- cooldown: 30s
- charges: 2 per combat
- host validates cooldown/charges and broadcasts `ability_apply`

## Fairness + Validation

Host validates:
- identity/mission match
- input rate limits (global + damage-intent-specific)
- deterministic checksum
- DPS envelope bounds (reject impossible spikes)

Invalid payloads:
- rejected with `input_rejected`
- contributor can be marked rejected for reward scoring

## Fail States, Reconnect, Spectate

- host tracks low-rate `player_state` updates
- team wipe when all active players are down simultaneously
- downed revive via `Rally` or survive timer
- reconnect uses `snapshot_request` -> `snapshot_resync` including combat state
- spectators see boss hp/phase/buffs/top contributors only

## Prototype Limitations

- local enemy simulation is still client-side; host validates summarized combat intents
- anti-cheat is envelope/checksum based, not full authoritative projectile replay
- current HUD is functional-first and optimized for mobile clarity
