# Draw on a Potato (MVP)

## Product Definition
- `Draw on a Potato` is a free-play creative sandbox.
- A potato template is the base canvas.
- Players create their own artwork and character designs with no scoring, timer, or winner.

## MVP Scope
This MVP includes all 8 requested features:

1. Potato template layer locked as background
2. Drawing tools: brush, eraser, size slider, color picker
3. Undo/redo plus clear canvas
4. Sticker pack (eyes, hats, mustaches, glasses, etc.)
5. Save/export image plus `New Potato` reset
6. Share to party feed/gallery
7. Duplicate/remix someone else's potato
8. Optional collaborative mode (multiple cursors on same potato)

## Core UX Flow
1. Player opens game and lands on an editor with a default potato template.
2. Player draws and places stickers.
3. Player saves locally or exports image.
4. Player can publish to party gallery.
5. Player can open a gallery creation and remix it into a new draft.
6. Player can create or join a collaborative session and co-draw in real time.

## Editor UI States
- `Idle`: tool panel visible, potato template loaded, no unsaved changes indicator.
- `Editing`: unsaved changes indicator shown.
- `Sticker placement`: selected sticker follows pointer until placed.
- `Exporting`: temporary busy state while generating image blob.
- `Reset confirm`: modal before clearing draft or starting `New Potato`.

## Tooling Details
- Brush
  - Color from color picker.
  - Size from slider.
  - Opacity fixed for MVP.
- Eraser
  - Size from slider.
  - Erases only user-drawn layer and placed stickers (never erases potato template).
- Stickers
  - Single-tap place.
  - Drag to move after placement.
  - Optional rotate/scale handles can be deferred if needed for schedule.
- Undo/Redo
  - Minimum stack depth target: `50` actions.
  - Actions tracked: strokes, sticker add/remove/move, clear canvas.

## Layer Model
- `Layer 0 (locked)`: potato template image.
- `Layer 1`: raster drawing layer (brush + eraser).
- `Layer 2`: sticker layer (transformable sticker objects).
- Export merges all visible layers into a final image.

## Social Features
### Share to Party Feed/Gallery
- Player can publish a finished creation with:
  - `title` (optional)
  - `author`
  - `createdAt`
  - rendered preview image
- Gallery cards support open/view/remix.

### Duplicate/Remix
- `Remix` creates a new editable draft from a selected gallery item.
- New draft metadata:
  - `remixOfArtworkId`
  - `remixDepth`

### Optional Collaborative Mode
- Host creates a live room.
- Participants see:
  - live strokes
  - sticker placement updates
  - collaborator cursor indicators
- Conflict policy (MVP): last-write-wins for sticker transform updates.

## Data Model (Draft)
```ts
type PotatoArtwork = {
  id: string;
  templateId: "classic-potato-v1";
  title?: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  drawingOps: DrawOp[];
  stickers: StickerInstance[];
  remixOfArtworkId?: string;
  remixDepth?: number;
  visibility: "private" | "party";
};
```

## Multiplayer Events (Collaborative Mode)
- `potato.session.join`
- `potato.cursor.move`
- `potato.draw.begin`
- `potato.draw.segment`
- `potato.draw.end`
- `potato.sticker.add`
- `potato.sticker.update`
- `potato.sticker.remove`
- `potato.canvas.clear`
- `potato.state.snapshot`

Host sends periodic snapshots for recovery and late joiners.

## Non-Goals (Post-MVP)
- Competitive judging, timers, rounds, leaderboards
- Marketplace/cosmetic purchases
- AI prompt generation
- Advanced layer compositing and blend modes

## Acceptance Criteria
- Player can draw freely on a locked potato template.
- Player can use brush/eraser with adjustable size and color.
- Undo/redo and clear are reliable during long sessions.
- Player can place stickers and include them in exports.
- Player can export final artwork as an image.
- Player can publish artwork to party gallery.
- Player can remix a gallery artwork into a new draft.
- In collaborative mode, multiple players can co-draw with visible cursors and stable state sync.
