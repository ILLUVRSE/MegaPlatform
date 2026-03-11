# Throw Darts

## Controls
- Touch or mouse flick upward to throw.
- Swipe direction controls aim drift.
- Swipe speed/length controls throw power.
- Optional timing meter: release near center for best accuracy.

## Modes and rules
- `301`: starts at 301, subtract score to zero.
- `501`: starts at 501, subtract score to zero.
- `Double Out` (default on): finishing dart must be a double.
- `Cricket`: close `20,19,18,17,16,15,Bull` with 3 marks each. Extra marks score only when opponent is still open.

## Match types
- `Practice`: infinite throws, no win pressure, target highlight cycling.
- `Vs AI`: easy/medium/hard turn-based match.
- `Local`: two-player hotseat turns.

## Options
- `Sensitivity`: low/medium/high, affects power scaling.
- `Timing Meter`: skill timing release modifier.
- `Assist`: light lateral drift reduction.
- `Double Out`: x01 finish rule toggle.

## AI behavior
- Easy: larger spread, weaker timing release consistency.
- Medium: moderate grouping and target logic.
- Hard: tighter grouping with small but real miss chance.
- x01 strategy: basic checkout attempts and double leave planning.
- Cricket strategy: closes high-value numbers first, then scores on open targets when favorable.
