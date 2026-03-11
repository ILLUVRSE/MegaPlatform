# Chronicles of the Silver Road

A mobile-first narrative adventure inspired strictly by the 1900 novel, with deterministic chapter-map progression, companion growth, and replayable mini-games.

## Disclaimer
Inspired by the 1900 public domain novel by L. Frank Baum. This game is not affiliated with any film adaptation.

## Route and ID
- Game ID: `oz-chronicle`
- Route: `/play/oz-chronicle`
- Status: `live`

## Chapter Pack #9 Summary
- Continues with the party's return to Emerald City and a book-faithful second Wizard resolution arc.
- Adds the Wizard's ordinary-man revelation (`humbug` context) in concise story form without adaptation lines.
- Grants symbolic companion gifts for brains, heart, and courage; records them in story flags and the Mementos panel.
- Adds deterministic minigame `balloon-rigging` for launch preparation timing.
- Runs the book-faithful balloon departure attempt and mishap, leaving Dorothy still in Oz.
- Expands map to Pack 1/2/3/4/5/6/7/8/9 with roughly 102-120 deterministic nodes.
- Updates quest direction to `Find Another Way Home`.

## Baum-Only Compliance Checklist
- Uses only 1900 novel-accurate events and character context.
- Keeps the 1900 silver-slippers detail only.
- Uses Good Witch of the North context and avoids later adaptation branding.
- No film quotes, songs, set recreations, or adaptation-specific design cues.
- No film-derived witch cues or adaptation-signature costume shorthand.
- Uses an original title and original visual language.
- Includes automated Baum-only compliance tests guarding prohibited film-only references.

## Characters and Elements Used
- Dorothy Gale
- Toto
- Scarecrow
- Tin Woodman
- Cowardly Lion
- Good Witch of the North
- Witch of the East context
- Silver slippers and protective mark
- Kalidahs (book creature description)
- Deadly poppy field and sleep effect
- Queen of the Field Mice rescue
- Forest road toward the Emerald City
- Guardian of the Gates and city entry protocol
- Mandatory green spectacles admission detail from the novel
- First Wizard audience with varying perceived forms
- Westward mission condition setup from the novel arc

## Companion System
Companion roster tracked in save data:
- `scarecrow` (brains trait meter)
- `tin-woodman` (heart trait meter)
- `cowardly-lion` (courage trait meter)

Companion meters are modified by story outcomes and mini-games, clamp at `0..9`, and now affect Pack #3 outcomes:
- High Scarecrow meter unlocks optional smart-route story choices.
- High Tin meter grants rescue-efficiency bonuses.
- High Lion meter reduces poppy sleep penalty pressure.
- Bonus outcomes are surfaced with "Companion Bonus Applied" tags.
- Pack #4 adds meter-gated optional city dialogue with no main-route progression blocks.

## Mini-Games
- `cyclone-escape`
- `cornfield-rescue`
- `silver-slippers-dash`
- `oil-and-joints`
- `courage-trial`
- `forest-crossing`
- `kalidah-chase` (boss)
- `poppy-drift-rescue` (boss)
- `spectacle-fastening`
- `audience-perception`
- `shadow-of-the-west` (boss)
- `western-hold-escape` (boss)
- `dousing-the-shadow` (boss)
- `balloon-rigging`

## Story Sketches Collectibles
Data file: `src/content/oz-chronicle/sketches.json`

Sketches unlock through:
- Perfect mini-game performances
- Optional side-route rewards
- Pack progression milestones
- Pack #3 story milestones (Kalidahs, poppy field, field mice)
- Pack #4 story milestones (Guardian gate, city entry, palace approach)
- Pack #5 story milestones (first audience, four requests, westward oath)
- Pack #6 story milestones (westward travel, Winkie country, western threat cliffhanger)
- Pack #7 story milestones (capture, Golden Cap, western hold escape)
- Pack #8 story milestones (water confrontation, Winkie gratitude, return-road setup)
- Pack #9 story milestones (Wizard revelation, symbolic gifts, balloon mishap)

Golden Cap mechanics:
- Acquired through Pack #7 story progression.
- Uses are limited to `3` and tracked in save state.
- Commands are consumed by narrative command choices and by `Clear Path` assist use in `western-hold-escape`.
- `Clear Path` can also be spent as an optional deterministic assist during `dousing-the-shadow`.
- Command history is recorded as a short log in state for deterministic replay/debug context.

`dousing-the-shadow` controls and fairness:
- One-thumb drag steers lane position and `Ready Water` taps are timed to threat-swell peaks.
- Three successful douse windows are required while keeping fear below fail threshold.
- Companion assists are bounded: one Scarecrow timing-window extension, one Tin fear-ward window, one Lion steady pulse.
- Optional Golden Cap `Clear Path` briefly clears swell pressure but is not required to win.
- Swell patterns and peak windows are deterministic from seed, difficulty preset, and node id.

`balloon-rigging` controls and fairness:
- Single `Secure` action with timing windows for deterministic launch-prep steps.
- Steps represent rope knots, basket latch, wind vane alignment, and burner check.
- Step sequence and timing windows are deterministic from seed, difficulty preset, and node id.
- Scoring rewards clean, quick execution; perfect runs unlock a sketch.

Mementos panel:
- Lightweight HUD panel showing symbolic gift completion:
- Scarecrow token, Tin Woodman token, Lion token.
- Purely narrative collectible state, persisted in save data.

`western-hold-escape` controls and fairness:
- One-thumb drag steers lane position.
- `Hide` reduces alarm in cover pockets.
- Rescue tokens (target: 3) unlock the escape latch.
- Companion assists: Scarecrow reveal pulse, Tin one-time barrier lift, Lion one-time patrol pause.
- Optional Golden Cap `Clear Path` command creates a brief deterministic safe corridor and consumes one command use.
- Patrol/hazard/token layouts are deterministic from seed, difficulty preset, and node id.

`shadow-of-the-west` controls and fairness:
- One-thumb drag steers lane position; `Hide` pauses in cover windows.
- Deterministic sweep masks, cover masks, and rescue-token lanes come from seed plus difficulty preset.
- Companion assists are limited and transparent: Scarecrow route reveal window, one Tin ward reduction, one Lion steady-breath nullification pulse.
- Failure and scoring are deterministic for the same seed, preset, and inputs.

## Content JSON Format
- `src/content/oz-chronicle/chapters.json`
- `src/content/oz-chronicle/glossary.json`
- `src/content/oz-chronicle/minigames.json`
- `src/content/oz-chronicle/artPalette.json`
- `src/content/oz-chronicle/sketches.json`

`chapters.json` required structure:
- `chapters[]`: `{ id, title, startNodeId, nodes[] }`
- `nodes[]`: `{ id, text, choices[] }`
- `choices[]`: `{ id, label, nextNodeId, outcome }`

## Original Visual Identity Rules
- Storybook engraving direction with dark ink outlines and flat color planes.
- No derivative silhouettes from film costumes, sets, or adaptation branding.
- Typography: Georgia for narrative headers, Trebuchet MS for interactive labels.
- Motion is subtle, with reduced-motion support for players who disable animation.
- Emerald City scenes keep original non-film-derived composition while applying an optional, subtle green spectacles tint overlay for book-accurate context only.

## Visual System Notes
- Oz-only skins (stored locally for this game only): `Engraved Paper`, `Night Ink`, `Field Bloom`.
- Semantic palette tokens are defined in `src/content/oz-chronicle/artPalette.json` and applied to panels, HUD chips, buttons, overlays, and minigame HUD wrappers.
- Deterministic scene composition uses seeded background layers by chapter context (`road`, `field`, `city`, `west`) for consistent Party-mode presentation.
- Lightweight pooled VFX are used for tap ripple, sparkle celebration, and ink-puff alerts; reduced motion suppresses these transitions.
- Page-turn transition is UI-only and respects reduced-motion settings.

## Oz Asset Pack
- Assets live under `src/games/oz-chronicle/assets/`.
- Manifest: `src/games/oz-chronicle/assets/manifest.json`.
- Asset roles include: UI icons, background motifs, and minigame HUD icons.
- Keep all new art abstract/original and Baum-only; avoid film-derived silhouettes or costume shorthand.

## Graphics Panel
- In-game `Graphics` panel controls:
- `Effects Quality`: low / med / high
- `Particle Density`: low / normal
- `Background Detail`: off / basic / enhanced
- `Reduced Motion`: local override for oz-chronicle visuals
- Auto-fallback lowers quality when FPS remains below 40 for roughly 2 seconds.

## Multiplayer Stub Note
`oz-chronicle` currently uses a Party-safe multiplayer stub adapter only.
Potential future mode concepts:
- Co-op choice voting
- Score chase mini-game playlists
