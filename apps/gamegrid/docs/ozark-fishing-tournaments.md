# Ozark Fishing Tournaments

## Overview
Ozark Party rooms can run deterministic community tournaments without backend storage.

Supported formats:
- Bracket Tournament (single elimination, 4-16 players)
- League Night (round-robin + optional top-2 final, 4-8 players)

Tournament state is host-authoritative and carried by the Ozark multiplayer adapter snapshot/events.

## Data Model
Engine files:
- `src/games/ozark-fishing/tournament/types.ts`
- `src/games/ozark-fishing/tournament/bracket.ts`
- `src/games/ozark-fishing/tournament/league.ts`
- `src/games/ozark-fishing/tournament/tournament.ts`
- `src/games/ozark-fishing/tournament/poster.ts`
- `src/games/ozark-fishing/tournament/history.ts`

Key state:
- deterministic seed order from stable hash of `playerId + roomSeed`
- bracket/league match graph
- active match assignment (`players`, `spectators`)
- final standings

## Event Types
Tournament lifecycle events emitted by host adapter:
- `tournament_create { config, roster, seedOrder }`
- `tournament_start { bracketState | leagueState }`
- `match_assign { matchId, players, spectators }`
- `match_result { matchId, standings, tieBreakData }`
- `tournament_advance { updatedState }`
- `tournament_end { finalStandings }`

These are transported through existing multiplayer event broadcast (`event` packets). No protocol changes were added.

## Tie-Break Rules
Bracket and league match results use deterministic tie-breaks:

Derby:
1. Total weight
2. Biggest fish
3. Earliest last catch timestamp

Big Catch:
1. Biggest fish
2. Total weight
3. Earliest first catch timestamp

## Party Enforcement
Only currently assigned match players can act.
- Non-assigned participants are forced into spectator phase.
- Spectator cast/hook/reel inputs are rejected by host (`inputRejected`).

Reconnect behavior:
- Clients restore role and current tournament phase from host snapshot.

## Poster Export
Renderer:
- `src/games/ozark-fishing/tournament/poster.ts`

Output:
- 1200x1600 PNG-like blob (`image/png`)
- includes tournament name/date/format/match type/duration
- includes top standings + podium metadata
- export remains fully offline

In-party gameplay screen:
- press `P` during Ozark multiplayer to export current tournament poster.

## Local Host History
Host stores last 10 tournaments locally:
- format, match type, date
- final standings
- top fish and poster metadata

Storage key:
- `gamegrid.ozark-fishing.tournaments.v1`
