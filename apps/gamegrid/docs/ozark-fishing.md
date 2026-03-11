# Ozark Fishing

## Core Play
- Swipe up to cast (or use Cast button).
- Tap during bite prompt to hook.
- Hold Reel to manage tension/line tightness.
- Modes: Free Fish, Timed Derby, Big Catch, Ice Fishing.

## Seasons (Deterministic Calendar)
- Season resolves from UTC date/month mapping: Spring, Summer, Fall, Winter.
- Season modifies fish weighting, weather odds, and visual theme.
- UI banner shows current season and weekly event.

## Weekly Events (Deterministic by ISO Week)
- One event rotates each week from local content.
- Events can modify fish boosts, bite multipliers, rarity odds, zones, and scoring bonuses.
- Party host can set Weekly Event ON/OFF; ON locks event id in session config.

## Ice Fishing
- Available in Winter, or via Sandbox allow toggle.
- Ice loop:
- Drill hole meter first.
- Vertical drop (no long cast lane).
- Jig rhythm (tap cadence) influences bite weighting.
- Reeling tension uses the same core deterministic tension model.

## Legendaries + Sightings
- Limited-time legendaries are gated by season and active event.
- Eligibility is deterministic and included in session configuration for fairness.
- Weekly deterministic Sighting hint appears in UI (informational only, not guaranteed spawn).

## Tournament Formats (Party)
Host can enable Tournament Mode in `/party` for Ozark:
- Bracket Tournament: single elimination, 4-16 players, byes when needed.
- League Night: round-robin for 4-8 players, then optional top-2 final.

Host controls:
- Tournament Mode (on/off)
- Format (Bracket / League)
- Match Type (Derby / Big Catch)
- Match Duration (2/3/5 min)
- Tournament Name

Lobby preview shows:
- roster seed order
- estimated rounds
- estimated total duration

## Tournament Tie-Break Rules
Derby:
1. Total weight
2. Biggest fish
3. Earliest last catch time

Big Catch:
1. Biggest fish
2. Total weight
3. Earliest catch time

## Tournament Match Flow
- Host locks roster by starting game.
- Adapter assigns active match players and auto-spectators.
- Spectator inputs are rejected by host authority.
- Bracket/league advances automatically after each match.
- Final standings and podium are shown in tournament snapshot state.

## Shareable Tournament Poster
- Renderer outputs 1200x1600 PNG locally (offline).
- Includes branding, tournament metadata, final standings, and podium details.
- In-party Ozark multiplayer HUD supports export via `P` key.

## Graphics Overhaul
- Water rendering now uses layered gradients + multi-pass wave lines + shoreline foam.
- Underwater depth pass adds fog, drifting particulate specks, weed sway, and sunny light shafts.
- Rain and fight moments use pooled ripple/splash particle effects.
- Night adds vignette + moon reflection path; winter/ice mode adds crack texture, frost edge vignette, drill debris, breath vapor, and hole shimmer.
- Scene composition now assembles deterministic spot-specific layers:
- sky gradient
- distant treeline silhouette
- midground shoreline
- water reflection overlay
- foreground props
- ambient particles
- Spot signatures:
- Cove: lily pads + reeds
- Dock: dock posts + rope float
- Open Water: distant islands + larger wave bands
- River Mouth: current streaks + driftwood
- Clouds render in 2 parallax bands with reduced-motion static fallback.
- Dawn/winter mist, night fireflies, winter snow, and daytime fall leaves are visual-only ambient effects.

## Performance Scaling
- Visual FX systems use fixed-size pooling (ripples, particles, splash bursts) to avoid churn.
- A smoothed FPS watcher auto-falls back to low visual complexity after sustained low performance (below 40 FPS for ~2s).
- Dev-only FPS HUD can be toggled in scene (`F8`) to inspect runtime scaling state.

## Graphics Settings
- Graphics panel in Ozark scene provides:
- Effects Quality: Low / Medium / High
- Environment Detail: Off / Basic / Enhanced
- Water Detail: Off / Basic / Enhanced
- Particle Density: Low / Normal
- Reduced Motion toggle
- Cinematic Camera: Off / Subtle / Full
- Cinematic Slow-Mo: On / Off
- Dynamic Mix toggle
- Music Volume slider
- SFX Volume slider
- Legendary Aura toggle
- FPS HUD toggle (dev-only)
- Settings persist locally and are visual-only (no gameplay, progression, or multiplayer fairness impact).
- Quality profile behavior:
- Low: static sky, minimal props, no ambient particles
- Medium: clouds, moderate props, light ambient particles
- High: full layered composition, richer props, full ambient set

## Cinematic Camera
- Modes:
- Idle Lake Cam: subtle drift and bobber-centered framing.
- Cast Cam: anticipates along cast direction, then eases toward bobber.
- Hook/Fight Cam: tighter framing on bobber + fish direction cue, with impact bumps on heavy runs.
- Catch Reveal Cam: short zoom/ease reveal for trophy moments; user can skip instantly.
- Camera is render-only and does not alter simulation coordinates, cast math, or timing.

## Cinematic Slow-Mo (Fairness Rules)
- Triggered only on:
- perfect hook timing
- legendary strike moment
- dramatic peak run moments
- Slow-mo is visual-only: simulation `dt`, authoritative timers, and event timestamps are unchanged.
- Duration is clamped to short bursts (250-450ms).
- Reduced Motion or performance fallback forces slow-mo OFF.

## Dynamic Music + SFX Mix
- Music layers:
- Ambient base loop
- Tension layer crossfaded by fight tension
- Victory sting on catch
- SFX mix includes:
- ducking around bite/catch moments
- bite tick, hook snap, reel click, tension creak scaling by tension
- splash variation via seeded randomness path
- Mix always respects mute + local music/SFX volume settings.

## UI Microinteractions + Big Moments
- Buttons get press scale/shadow feedback and optional haptic tap.
- Panels use glass-like styling and smooth open/close transitions with instant fallback under Reduced Motion.
- Catch card polish:
- rarity glow ring
- eased XP fill
- trophy badge pop
- Big moment sequence (rare/legendary or 95th percentile catch): vignette + sparkle ripples + trophy banner + share-card emphasis.
- Sequence is non-blocking and instantly skippable by tap.

## Fish Visual Content Pass
- Species-specific visual configs are defined in `src/content/ozark-fish-visuals.json`.
- Runtime fish renderer uses silhouette families (bass/panfish/catfish/gar/trout/walleye/carp/muskie/paddlefish).
- Animation presentation states:
- idle swim
- bite nudge
- hooked thrash
- exhausted drift
- Shadows scale by depth, and fish rendering is pooled for stable frame time.

## Cosmetics (Visual-Only)
- Cosmetics data lives in `src/content/ozark-cosmetics.json`.
- Bobber skins: selectable, persisted, and visual-only.
- Lure skins: selectable per lure id, persisted, and visual-only.
- Unlock paths include:
- level milestones
- challenge completions
- season reward cosmetics
- Cosmetics are always multiplayer-safe because they do not affect lure stats or rules.

## Surface Jump Moment (Visual-Only + Deterministic)
- Rare/Legendary or 95th-percentile catches can trigger a deterministic surface jump during fight.
- Trigger timing/arc are derived from deterministic seed + event id for fairness/replay consistency.
- Jump presentation adds breach arc + splash and optional subtle camera impact bump.
- It does not alter tension/stamina/outcome logic.
- Reduced Motion and performance fallback suppress jump shake/heavy motion.

## Reduced Motion + Performance Fallback
- Reduced Motion forces:
- camera mode off
- slow-mo off
- heavy transitions off
- camera shake off
- cloud drift off
- ambient environment particles off
- Performance fallback (sustained low FPS) disables:
- camera drift and cinematic camera offsets
- slow-mo
- heavy UI transitions
- high-density extra particles
- enhanced environment detail and heavy ambient passes

## Spot Preview + Photo Packs
- Spot selector includes a live preview thumbnail tinted by current season/time/weather.
- Photo exports include deterministic environment background pack metadata and hide UI when requested.

## Progression, Highlights, and Stats
- Trophy book tracks best/caught context per species.
- Replays, highlights, and catch cards are local-only artifacts.
- Lake Stats panel tracks:
- total catches
- average weight by species
- most caught species
- legendary count
- longest fight
- highest tension survived
- best derby finish

## Season Standings + Cosmetic Rewards
- Local standings track weekly best derby, best big catch, and rare catches by season.
- Rewards are cosmetic only (titles, card frames, lure skins labels).
- Rewards do not modify gameplay variables.

## Party Fairness Rules
- Host-authoritative catch outcomes remain canonical.
- Season/event keys are locked in deterministic session config.
- Replay/share/standings remain local and are not broadcast.
- Tournament active/spectator assignments are host-enforced.
