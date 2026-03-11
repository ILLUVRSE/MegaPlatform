# Starlight Chronicles

Starlight Chronicles is a mobile-first roguelite run game at `/play/starlight-chronicles`.

## Solo Run Structure

Each solo run uses a deterministic seeded Star Map:
- 3 lanes
- 3 to 6 steps
- final step always Boss nodes

Node types:
- `STORY`
- `EXPLORE`
- `COMBAT`
- `SHOP`
- `DELIVERY` (when routing active trade contracts)
- `PATROL` (assist/avoid/ambush faction patrols)
- `ESCORT` (protect convoy objective)
- `BOSS`

## Universe + Economy Layer (EVE-lite)

Bridge now includes:
- `Nav Map` for selecting region/system and route target
- `Market` for deterministic buy/sell cargo trading
- weekly `Galactic Report` showing contested frontlines

Economic simulation is offline-first and deterministic:
- seeded universe with SAFE/LOW/NULL system security
- deterministic daily prices per system and good
- weekly deterministic market shocks
- deterministic contract generation and expiry
- deterministic frontline contested systems

Trade/risk systems:
- cargo capacity and manifest
- legal vs contraband goods
- inspections when carrying contraband into SAFE/LOW systems
- optional bribe and hidden-compartment mitigation
- piracy ambush chance based on security tier + frontline pressure
- deterministic flee outcome based on ship/crew modifiers

## Shipyard + Hangar

Bridge now includes:
- `Hangar`: view owned hulls, switch active ship, preview cosmetics, export share card
- `Shipyard`: buy/unlock additional hull classes
- `Fleet`: assign wingmen, select active drone, and recruit deterministic offers

Hull classes now drive gameplay:
- Scout: fast, evasive, low cargo
- Frigate: balanced baseline
- Freighter: high cargo, lower combat mobility
- Interceptor: high combat tempo, low cargo
- Science Vessel: scan/anomaly focused
- Gunship: high damage with lower scan utility

Fitting and stats are hull-aware:
- slot counts vary per hull (`weapon`/`shield`/`utility`)
- per-hull loadouts persist when switching ships
- overflow fitting trims deterministically when moving to tighter slot layouts
- cargo capacity and flee modifiers come from active hull

Cosmetics are visual-only:
- skins, decals, engine trails
- unlock via rank, faction standing, weekly reports, and contract milestones
- no stat or combat balance changes from cosmetics

## Crew + Damage Systems

Bridge crew stations:
- Captain: diplomacy/morale
- Science Officer: scan/anomaly handling
- Engineer: repairs/shop efficiency
- Tactical Officer: combat bonuses

Ship damage state persists:
- hull integrity
- systems damage tiers (`engines`, `weapons`, `sensors`)

Determinism:
- seeded run graph
- seeded dialogue selection
- seeded damage rolls (`runSeed + nodeId + eventIndex`)

## Co-op Run Prototype (Party Rooms)

Starlight supports a host-authoritative co-op prototype in Party Rooms.

Party basics:
- 2 to 4 players share one seeded run
- host owns authoritative run snapshot and phase
- reconnect clients request `snapshot_resync`
- spectators can join and watch phase/votes/combat status

### Voting

Default behavior:
- vote on node selection
- vote on Story/Explore choices
- 15 second timer per vote
- host can skip timer or force selection

Resolution:
- majority wins
- tie-break is deterministic using seed + seat order + vote key

### True Co-op Combat (Shared Boss)

No per-frame combat stream is used.

Flow:
1. host starts shared combat with mission seed + schedule seed
2. clients run local visual sim and submit low-rate `dmg_intent`
3. host validates intent checksum/rate/DPS envelope
4. host updates shared boss hp and broadcasts `boss_state` (~5 Hz)
5. host announces `boss_phase` transitions and ends combat on boss defeat, wipe, or timeout

Shared state:
- host authoritative boss HP + phase progression
- host authoritative rewards and ship consequences
- deterministic phase timeline from seed + ordered event inputs

### Support Abilities

Co-op ability bar has four role abilities:
- Captain `Rally`: temporary team damage buff + revive assist
- Science `Scan Lock`: slows boss schedule/telegraph cadence
- Engineer `Patch Field`: defensive support + deterministic post-fight repair
- Tactical `Overcharge`: temporary team damage boost

Rules:
- cooldown: 30 seconds
- charges: 2 per combat
- host validates casts and broadcasts `ability_apply`

### Team Wallet + Rewards

Prototype defaults:
- team wallet ON (shared credits/materials)
- deterministic module distribution logic
- contribution score uses boss damage + survival + support usage
- contribution-based bonus roll is deterministic from seed + player order

## Fleet Ops

Fleet systems are deterministic and offline-first:
- up to 2 active wingmen from owned roster
- 1 active drone with small support effects
- patrol presence per system/week influences encounters and risk
- escort nodes resolve convoy objective outcomes

Co-op authority model for fleet:
- host validates hull/fleet ids
- host owns escort convoy HP state
- clients render convoy/boss state from snapshots and events

## Co-op Limitations (Prototype)

- local enemies/waves remain client-side for performance
- host validates low-rate combat intents instead of full lockstep hit simulation
- anti-cheat is bounded validation, not full authoritative replay
