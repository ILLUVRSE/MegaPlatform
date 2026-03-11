# GameGrid Professional Gate

This folder defines the "professional" acceptance criteria for each game.
Use these checklists as release gates and QA signoff artifacts.

## Universal Professional Bar (all games)
- [ ] First-playable in <= 5 seconds (or clear loading indicator with progress).
- [ ] Controls feel responsive; no missed inputs; consistent with portal standard.
- [ ] Tutorial: 10-25s "how to win" + controls (skippable), plus a clear rules modal.
- [ ] Game loop: clear start -> play -> end -> rematch/exit; no dead ends.
- [ ] UI polish: readable on mobile, safe-area correct, no overlaps, no tiny text.
- [ ] Performance: stable 60fps target; no persistent jank; memory stable across rematches.
- [ ] Audio: mix levels sane; mute works; no clipped/stacked sounds.
- [ ] Reliability: no crashes, no softlocks, no stuck waiting states.
- [ ] Fairness: no obvious exploits; no RNG decides winner unless explicitly a luck game.
- [ ] Multiplayer (if live): reconnect strategy or graceful handling; desync detection + resync; quit handling.

## Per-Game Criteria
- homerun-derby: docs/pro-gate/homerun-derby.md
- minigolf: docs/pro-gate/minigolf.md
- goalie-gauntlet: docs/pro-gate/goalie-gauntlet.md
