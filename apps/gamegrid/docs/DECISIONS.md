# Starlight Chronicles Vertical Slice Decisions

- Chosen architecture: isolated Phaser scene stack in `src/scenes/*` with lightweight shared runtime state in `src/scenes/starlightState.ts`.
- Existing legacy Starlight implementation is preserved; single-player now routes to the new vertical slice while multiplayer fallback keeps the previous scene.
- Art/audio placeholders are procedural and local to keep the build fully offline.
- Fixed-step combat simulation uses a 60 Hz accumulator in `Sortie` for deterministic-ish movement/combat behavior.
- Mobile controls are intentionally simplified for the slice: always-on auto-fire, left joystick movement, and two right-side action buttons.
- Data-driven balance is centralized in `src/data/starlight*.ts`; logic never hardcodes wave tables or module lists.
- Boss mechanics are simplified but complete: telegraphed beam sweep, drone ring summons, and charge volleys.
- Hangar policy: allow equipping invalid builds for comparison/planning, but block mission launch unless build passes validation.
- Reward application policy: Sortie writes pending result; Results screen commits rewards after player confirms salvage choices.
- Run-state policy: mission + perk are tracked in `activeRun`; Sortie requires selected perk unless explicit debug bypass is enabled.
