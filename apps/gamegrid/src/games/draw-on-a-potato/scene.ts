import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { createProtocolMessage, type MpRole } from '../../mp/protocol';
import { WebRtcDataTransport, type TransportPacket } from '../../mp/transport';

interface SceneDeps {
  hooks: GameRuntimeHooks;
}

interface StrokePoint {
  x: number;
  y: number;
}

interface StrokeOp {
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: StrokePoint[];
}

interface StickerOp {
  id: string;
  glyph: string;
  x: number;
  y: number;
  size: number;
  rotationDeg: number;
}

interface PotatoSnapshot {
  revision: number;
  strokes: StrokeOp[];
  stickers: StickerOp[];
}

interface SharedPotatoArtwork {
  id: string;
  authorId: string;
  createdAt: number;
  previewDataUrl: string;
  snapshot: PotatoSnapshot;
}

type GallerySortMode = 'recent' | 'strokes' | 'stickers';

type PotatoNetOp =
  | { kind: 'stroke_commit'; opId: string; playerId: string; stroke: StrokeOp }
  | { kind: 'sticker_add'; opId: string; playerId: string; sticker: StickerOp }
  | { kind: 'sticker_transform'; opId: string; playerId: string; stickerId: string; x: number; y: number; size: number; rotationDeg: number }
  | { kind: 'sticker_delete'; opId: string; playerId: string; stickerId: string }
  | { kind: 'clear'; opId: string; playerId: string }
  | { kind: 'new_potato'; opId: string; playerId: string }
  | { kind: 'replace_snapshot'; opId: string; playerId: string; snapshot: PotatoSnapshot }
  | { kind: 'cursor'; playerId: string; x: number; y: number };

const GAME_ID = 'draw-on-a-potato';
const GALLERY_KEY = 'gamegrid.draw-on-a-potato.gallery.v1';
const DRAFT_KEY = 'gamegrid.draw-on-a-potato.draft.v1';
const TOOLBAR_HEIGHT = 126;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const POTATO_X = 640;
const POTATO_Y = 420;
const POTATO_W = 540;
const POTATO_H = 520;

export class DrawOnAPotatoScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private drawingGraphics!: Phaser.GameObjects.Graphics;
  private stickerLayer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private collabText!: Phaser.GameObjects.Text;
  private cursorLayer!: Phaser.GameObjects.Container;
  private isDrawing = false;
  private currentStroke: StrokeOp | null = null;
  private selectedTool: 'brush' | 'eraser' = 'brush';
  private selectedColor = '#1f2937';
  private brushSize = 10;
  private stickerIndex = 0;
  private stickerGlyphs = ['OO', 'B-)', '/\\', 'M', 'CHEF', 'CROWN', 'NOSE', 'LIPS'];
  private strokes: StrokeOp[] = [];
  private stickerOps: StickerOp[] = [];
  private stickerNodes = new Map<string, Phaser.GameObjects.Text>();
  private undoStack: PotatoSnapshot[] = [];
  private redoStack: PotatoSnapshot[] = [];
  private snapshotRevision = 0;
  private galleryIndex = 0;

  private draggingStickerId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragMoved = false;
  private pendingDragSticker: StickerOp | null = null;
  private selectedStickerId: string | null = null;
  private galleryButtons: Phaser.GameObjects.Text[] = [];
  private galleryCards: Phaser.GameObjects.GameObject[] = [];
  private galleryModalNodes: Phaser.GameObjects.GameObject[] = [];
  private galleryModalOpen = false;
  private galleryModalSort: GallerySortMode = 'recent';
  private galleryModalFilter: 'all' | 'mine' = 'all';
  private galleryModalPage = 0;
  private galleryPreviewTextureKeys = new Set<string>();
  private pendingPreviewLoads = new Set<string>();
  private dirty = false;
  private autosaveAccumulator = 0;

  private transport: WebRtcDataTransport | null = null;
  private role: MpRole | null = null;
  private localPlayerId = 'solo';
  private opCounter = 0;
  private appliedOpIds = new Set<string>();
  private snapshotAccumulator = 0;
  private cursorAccumulator = 0;
  private cursorNodes = new Map<string, Phaser.GameObjects.Container>();

  constructor({ hooks }: SceneDeps) {
    super('draw-on-a-potato-main');
    this.hooks = hooks;
  }

  create() {
    this.localPlayerId = this.hooks.multiplayer?.playerId ?? 'solo';
    this.role = this.hooks.multiplayer?.role ?? null;

    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0xf7f0df);
    this.createToolbar();
    this.drawTemplate();

    this.drawingGraphics = this.add.graphics().setDepth(20);
    this.stickerLayer = this.add.container(0, 0).setDepth(30);
    this.cursorLayer = this.add.container(0, 0).setDepth(35);

    this.statusText = this.add
      .text(20, CANVAS_HEIGHT - 42, 'Free play: draw anything on the potato template.', {
        color: '#4b5563',
        fontFamily: 'Arial',
        fontSize: '16px'
      })
      .setDepth(40);
    this.collabText = this.add
      .text(20, CANVAS_HEIGHT - 22, this.hooks.multiplayer ? 'Collab: connecting...' : 'Collab: solo mode', {
        color: '#6b7280',
        fontFamily: 'Arial',
        fontSize: '14px'
      })
      .setDepth(40);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.installKeyboardShortcuts();

    this.initMultiplayer();

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: GAME_ID,
      mode: this.hooks.multiplayer ? 'collab-session' : 'free-play'
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearGalleryModal();
      for (const key of this.galleryPreviewTextureKeys) {
        if (this.textures.exists(key)) {
          this.textures.remove(key);
        }
      }
      this.galleryPreviewTextureKeys.clear();
      this.pendingPreviewLoads.clear();
      this.transport?.disconnect();
      this.transport = null;
      this.hooks.reportEvent({ type: 'game_end', gameId: GAME_ID, outcome: 'sandbox_exit' });
    });
  }

  update(_time: number, deltaMs: number) {
    const dtS = Math.max(0, Math.min(0.1, deltaMs / 1000));
    if (this.dirty) {
      this.autosaveAccumulator += dtS;
      if (this.autosaveAccumulator >= 5) {
        this.autosaveAccumulator = 0;
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(this.snapshotNow()));
      }
    }

    if (!this.transport || this.role !== 'host') return;
    this.snapshotAccumulator += dtS;
    if (this.snapshotAccumulator >= 0.4) {
      this.snapshotAccumulator = 0;
      this.broadcastSnapshot();
    }
  }

  private createToolbar() {
    this.add.rectangle(CANVAS_WIDTH / 2, TOOLBAR_HEIGHT / 2, CANVAS_WIDTH, TOOLBAR_HEIGHT, 0xefe4ca).setDepth(10);

    let x = 16;
    x = this.addButton(x, 16, 'Brush', () => {
      this.selectedTool = 'brush';
      this.setStatus('Tool: Brush');
    });
    x = this.addButton(x, 16, 'Eraser', () => {
      this.selectedTool = 'eraser';
      this.setStatus('Tool: Eraser');
    });
    x = this.addButton(x, 16, 'Color', () => this.openColorPicker());
    x = this.addButton(x, 16, 'Undo', () => this.undo());
    x = this.addButton(x, 16, 'Redo', () => this.redo());
    x = this.addButton(x, 16, 'Clear', () => this.clearCanvas());
    x = this.addButton(x, 16, 'New Potato', () => this.newPotato());
    x = this.addButton(x, 16, 'Sticker', () => this.addStickerAt(POTATO_X, POTATO_Y));
    x = this.addButton(x, 16, 'Export', () => this.exportArtwork());
    x = this.addButton(x, 16, 'Save Draft', () => this.saveDraft());
    x = this.addButton(x, 16, 'Load Draft', () => this.loadDraft());

    this.addButton(x, 16, this.hooks.multiplayer ? 'Collab: On' : 'Collab: Off', () => {
      this.setStatus(this.hooks.multiplayer ? 'Collab active.' : 'Start from Party Room to collaborate.');
    });

    let x2 = 16;
    x2 = this.addButton(x2, 72, 'Share', () => this.shareArtwork());
    x2 = this.addButton(x2, 72, 'Gallery Prev', () => this.galleryPrev());
    x2 = this.addButton(x2, 72, 'Gallery Next', () => this.galleryNext());
    x2 = this.addButton(x2, 72, 'Remix Selected', () => this.remixSelected());
    x2 = this.addButton(x2, 72, 'Sticker +', () => this.bumpSelectedSticker(4, 0));
    x2 = this.addButton(x2, 72, 'Sticker -', () => this.bumpSelectedSticker(-4, 0));
    x2 = this.addButton(x2, 72, 'Rotate L', () => this.bumpSelectedSticker(0, -10));
    x2 = this.addButton(x2, 72, 'Rotate R', () => this.bumpSelectedSticker(0, 10));
    x2 = this.addButton(x2, 72, 'Delete Sticker', () => this.deleteSelectedSticker());
    x2 = this.addButton(x2, 72, 'Delete Shared', () => this.deleteSelectedShared());
    this.addButton(x2, 72, 'Gallery View', () => this.toggleGalleryModal());

    const swatches = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#ffffff'];
    swatches.forEach((hex, idx) => {
      const swatch = this.add
        .rectangle(720 + idx * 30, 84, 22, 22, Phaser.Display.Color.HexStringToColor(hex).color)
        .setStrokeStyle(2, 0x374151)
        .setDepth(14)
        .setInteractive({ useHandCursor: true });
      swatch.on('pointerdown', () => {
        this.selectedColor = hex;
        this.selectedTool = 'brush';
        this.setStatus(`Color: ${hex}`);
      });
    });

    const sizeLabel = this.add.text(930, 74, `Brush size ${this.brushSize}`, {
      color: '#1f2937',
      fontFamily: 'Arial',
      fontSize: '16px'
    });
    const plusX = this.addButton(1088, 68, '+', () => {
      this.brushSize = Math.min(40, this.brushSize + 2);
      sizeLabel.setText(`Brush size ${this.brushSize}`);
    });
    this.addButton(plusX, 68, '-', () => {
      this.brushSize = Math.max(2, this.brushSize - 2);
      sizeLabel.setText(`Brush size ${this.brushSize}`);
    });

    this.renderGalleryButtons();
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): number {
    const button = this.add
      .text(x, y, label, {
        color: '#111827',
        backgroundColor: '#fef3c7',
        fontFamily: 'Arial',
        fontSize: '15px',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setDepth(14)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', onClick);
    return x + button.width + 8;
  }

  private drawTemplate() {
    this.add.ellipse(POTATO_X, POTATO_Y, POTATO_W, POTATO_H, 0xc19a6b).setDepth(12).setStrokeStyle(4, 0x8b5a2b);
    this.add.ellipse(POTATO_X - 90, POTATO_Y + 26, 180, 150, 0xba8d57, 0.35).setDepth(13);
    this.add.ellipse(POTATO_X + 120, POTATO_Y - 44, 120, 100, 0xba8d57, 0.28).setDepth(13);
    this.add.text(POTATO_X - 130, POTATO_Y - POTATO_H / 2 - 30, 'Locked potato template', {
      color: '#6b4f2a',
      fontFamily: 'Arial',
      fontSize: '15px'
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.galleryModalOpen) return;
    if (pointer.y <= TOOLBAR_HEIGHT || !this.isOnCanvas(pointer.x, pointer.y)) return;

    const sticker = this.hitTestSticker(pointer.x, pointer.y);
    if (sticker) {
      this.selectedStickerId = sticker.id;
      this.pushUndoSnapshot();
      this.draggingStickerId = sticker.id;
      this.dragOffsetX = pointer.x - sticker.x;
      this.dragOffsetY = pointer.y - sticker.y;
      this.dragMoved = false;
      this.pendingDragSticker = { ...sticker };
      this.setStatus(`Selected sticker ${sticker.glyph}`);
      return;
    }

    this.selectedStickerId = null;

    this.isDrawing = true;
    this.currentStroke = {
      tool: this.selectedTool,
      color: this.selectedColor,
      size: this.brushSize,
      points: [{ x: pointer.x, y: pointer.y }]
    };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isOnCanvas(pointer.x, pointer.y)) return;
    this.broadcastCursor(pointer.x, pointer.y);

    if (this.draggingStickerId) {
      const sticker = this.stickerOps.find((entry) => entry.id === this.draggingStickerId);
      if (!sticker) return;
      sticker.x = pointer.x - this.dragOffsetX;
      sticker.y = pointer.y - this.dragOffsetY;
      this.pendingDragSticker = { ...sticker };
      this.dragMoved = true;
      this.redrawStickersOnly();
      return;
    }

    if (!this.isDrawing || !this.currentStroke || !pointer.isDown) return;
    const points = this.currentStroke.points;
    const prev = points[points.length - 1];
    const next = { x: pointer.x, y: pointer.y };
    points.push(next);
    this.drawSegment(prev, next, this.currentStroke);
  }

  private onPointerUp() {
    if (this.draggingStickerId) {
      if (this.dragMoved && this.pendingDragSticker) {
        this.redoStack = [];
        this.applyOrSendMutatingOp({
          kind: 'sticker_transform',
          opId: this.createOpId(),
          playerId: this.localPlayerId,
          stickerId: this.pendingDragSticker.id,
          x: this.pendingDragSticker.x,
          y: this.pendingDragSticker.y,
          size: this.pendingDragSticker.size,
          rotationDeg: this.pendingDragSticker.rotationDeg
        });
        this.setStatus('Sticker moved.');
      }
      this.draggingStickerId = null;
      this.pendingDragSticker = null;
      this.dragMoved = false;
      return;
    }

    if (!this.isDrawing || !this.currentStroke) return;
    if (this.currentStroke.points.length > 1) {
      this.pushUndoSnapshot();
      this.redoStack = [];
      this.applyOrSendMutatingOp({
        kind: 'stroke_commit',
        opId: this.createOpId(),
        playerId: this.localPlayerId,
        stroke: {
          tool: this.currentStroke.tool,
          color: this.currentStroke.color,
          size: this.currentStroke.size,
          points: this.currentStroke.points.slice()
        }
      });
    }
    this.isDrawing = false;
    this.currentStroke = null;
  }

  private drawSegment(from: StrokePoint, to: StrokePoint, stroke: StrokeOp) {
    if (stroke.tool === 'eraser') {
      this.drawingGraphics.lineStyle(stroke.size + 4, 0xf7f0df, 1);
    } else {
      this.drawingGraphics.lineStyle(stroke.size, Phaser.Display.Color.HexStringToColor(stroke.color).color, 1);
    }
    this.drawingGraphics.beginPath();
    this.drawingGraphics.moveTo(from.x, from.y);
    this.drawingGraphics.lineTo(to.x, to.y);
    this.drawingGraphics.strokePath();
  }

  private redraw() {
    this.drawingGraphics.clear();
    this.stickerLayer.removeAll(true);
    this.stickerNodes.clear();

    for (const stroke of this.strokes) {
      for (let idx = 1; idx < stroke.points.length; idx += 1) {
        this.drawSegment(stroke.points[idx - 1], stroke.points[idx], stroke);
      }
    }
    this.redrawStickersOnly();
  }

  private redrawStickersOnly() {
    this.stickerLayer.removeAll(true);
    this.stickerNodes.clear();
    for (const sticker of this.stickerOps) {
      const node = this.add
        .text(sticker.x, sticker.y, sticker.glyph, {
          fontFamily: 'Arial',
          fontSize: `${sticker.size}px`,
          color: '#111827',
          backgroundColor: sticker.id === this.selectedStickerId ? '#fff3cd' : undefined
        })
        .setDepth(30);
      node.setAngle(sticker.rotationDeg);
      this.stickerLayer.add(node);
      this.stickerNodes.set(sticker.id, node);
    }
  }

  private hitTestSticker(x: number, y: number): StickerOp | null {
    for (let idx = this.stickerOps.length - 1; idx >= 0; idx -= 1) {
      const sticker = this.stickerOps[idx];
      const node = this.stickerNodes.get(sticker.id);
      if (!node) continue;
      const bounds = node.getBounds();
      if (bounds.contains(x, y)) return sticker;
    }
    return null;
  }

  private addStickerAt(x: number, y: number) {
    this.pushUndoSnapshot();
    const glyph = this.stickerGlyphs[this.stickerIndex % this.stickerGlyphs.length];
    this.stickerIndex += 1;
    const stickerId = `sticker-${Date.now()}-${this.stickerIndex}`;
    this.selectedStickerId = stickerId;
    this.redoStack = [];
    this.applyOrSendMutatingOp({
      kind: 'sticker_add',
      opId: this.createOpId(),
      playerId: this.localPlayerId,
      sticker: {
        id: stickerId,
        glyph,
        x: x - 16 + Phaser.Math.Between(-40, 40),
        y: y - 16 + Phaser.Math.Between(-40, 40),
        size: 42,
        rotationDeg: 0
      }
    });
    this.setStatus(`Sticker placed: ${glyph}`);
  }

  private bumpSelectedSticker(sizeDelta: number, rotationDelta: number) {
    const target = this.selectedStickerId ? this.stickerOps.find((entry) => entry.id === this.selectedStickerId) ?? null : null;
    if (!target) {
      this.setStatus('Select a sticker first.');
      return;
    }
    this.pushUndoSnapshot();
    this.redoStack = [];
    this.applyOrSendMutatingOp({
      kind: 'sticker_transform',
      opId: this.createOpId(),
      playerId: this.localPlayerId,
      stickerId: target.id,
      x: target.x,
      y: target.y,
      size: Math.max(16, Math.min(96, target.size + sizeDelta)),
      rotationDeg: this.normalizeDeg(target.rotationDeg + rotationDelta)
    });
  }

  private deleteSelectedSticker() {
    const target = this.selectedStickerId ? this.stickerOps.find((entry) => entry.id === this.selectedStickerId) ?? null : null;
    if (!target) {
      this.setStatus('Select a sticker first.');
      return;
    }
    this.pushUndoSnapshot();
    this.redoStack = [];
    this.applyOrSendMutatingOp({
      kind: 'sticker_delete',
      opId: this.createOpId(),
      playerId: this.localPlayerId,
      stickerId: target.id
    });
    this.setStatus('Sticker deleted.');
  }

  private clearCanvas() {
    this.pushUndoSnapshot();
    this.redoStack = [];
    this.applyOrSendMutatingOp({
      kind: 'clear',
      opId: this.createOpId(),
      playerId: this.localPlayerId
    });
    this.setStatus('Canvas cleared.');
  }

  private newPotato() {
    this.pushUndoSnapshot();
    this.redoStack = [];
    this.stickerIndex = 0;
    this.applyOrSendMutatingOp({
      kind: 'new_potato',
      opId: this.createOpId(),
      playerId: this.localPlayerId
    });
    this.setStatus('New potato ready.');
  }

  private undo() {
    const previous = this.undoStack.pop();
    if (!previous) {
      this.setStatus('Nothing to undo.');
      return;
    }
    this.redoStack.push(this.snapshotNow());
    this.applyOrSendMutatingOp({
      kind: 'replace_snapshot',
      opId: this.createOpId(),
      playerId: this.localPlayerId,
      snapshot: previous
    });
    this.setStatus('Undo.');
  }

  private redo() {
    const next = this.redoStack.pop();
    if (!next) {
      this.setStatus('Nothing to redo.');
      return;
    }
    this.undoStack.push(this.snapshotNow());
    this.applyOrSendMutatingOp({
      kind: 'replace_snapshot',
      opId: this.createOpId(),
      playerId: this.localPlayerId,
      snapshot: next
    });
    this.setStatus('Redo.');
  }

  private snapshotNow(): PotatoSnapshot {
    return {
      revision: this.snapshotRevision,
      strokes: this.strokes.map((stroke) => ({
        tool: stroke.tool,
        color: stroke.color,
        size: stroke.size,
        points: stroke.points.map((point) => ({ x: point.x, y: point.y }))
      })),
      stickers: this.stickerOps.map((sticker) => ({ ...sticker }))
    };
  }

  private applySnapshot(snapshot: PotatoSnapshot) {
    this.snapshotRevision = Math.max(this.snapshotRevision, snapshot.revision ?? 0);
    this.strokes = snapshot.strokes.map((stroke) => ({
      tool: stroke.tool,
      color: stroke.color,
      size: stroke.size,
      points: stroke.points.map((point) => ({ x: point.x, y: point.y }))
    }));
    this.stickerOps = snapshot.stickers.map((sticker) => ({ ...sticker }));
    for (const sticker of this.stickerOps) {
      if (typeof sticker.rotationDeg !== 'number') sticker.rotationDeg = 0;
    }
    if (!this.stickerOps.some((entry) => entry.id === this.selectedStickerId)) {
      this.selectedStickerId = this.stickerOps[this.stickerOps.length - 1]?.id ?? null;
    }
    this.redraw();
  }

  private pushUndoSnapshot() {
    this.undoStack.push(this.snapshotNow());
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  private exportArtwork() {
    const png = this.renderPngDataUrl();
    const anchor = document.createElement('a');
    anchor.href = png;
    anchor.download = `draw-on-a-potato-${Date.now()}.png`;
    anchor.click();
    this.setStatus('PNG exported.');
  }

  private saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(this.snapshotNow()));
    this.dirty = false;
    this.autosaveAccumulator = 0;
    this.setStatus('Draft saved locally.');
  }

  private loadDraft() {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        this.setStatus('No saved draft found.');
        return;
      }
      const parsed = JSON.parse(raw) as PotatoSnapshot;
      this.pushUndoSnapshot();
      this.redoStack = [];
      this.applyOrSendMutatingOp({
        kind: 'replace_snapshot',
        opId: this.createOpId(),
        playerId: this.localPlayerId,
        snapshot: parsed
      });
      this.setStatus('Draft loaded.');
    } catch {
      this.setStatus('Draft could not be loaded.');
    }
  }

  private shareArtwork() {
    const gallery = this.pruneGallery(this.loadGallery());
    const entry: SharedPotatoArtwork = {
      id: `potato-${Date.now()}`,
      authorId: this.localPlayerId,
      createdAt: Date.now(),
      previewDataUrl: this.renderPngDataUrl(),
      snapshot: this.snapshotNow()
    };
    const next = [entry, ...gallery];
    const saved = this.saveGallery(next);
    this.galleryIndex = 0;
    this.renderGalleryButtons();
    if (this.galleryModalOpen) this.renderGalleryModal();
    this.setStatus(`Shared to gallery. Total ${saved.length}.`);
  }

  private galleryPrev() {
    const gallery = this.loadGallery();
    if (!gallery.length) {
      this.setStatus('Gallery is empty.');
      return;
    }
    this.galleryIndex = (this.galleryIndex - 1 + gallery.length) % gallery.length;
    const card = gallery[this.galleryIndex];
    this.renderGalleryButtons();
    if (this.galleryModalOpen) this.renderGalleryModal();
    this.setStatus(`Gallery ${this.galleryIndex + 1}/${gallery.length} (${new Date(card.createdAt).toLocaleTimeString()})`);
  }

  private galleryNext() {
    const gallery = this.loadGallery();
    if (!gallery.length) {
      this.setStatus('Gallery is empty.');
      return;
    }
    this.galleryIndex = (this.galleryIndex + 1) % gallery.length;
    const card = gallery[this.galleryIndex];
    this.renderGalleryButtons();
    if (this.galleryModalOpen) this.renderGalleryModal();
    this.setStatus(`Gallery ${this.galleryIndex + 1}/${gallery.length} (${new Date(card.createdAt).toLocaleTimeString()})`);
  }

  private remixSelected() {
    const gallery = this.loadGallery();
    if (!gallery.length) {
      this.setStatus('Gallery is empty. Share one first.');
      return;
    }
    const selected = gallery[this.galleryIndex % gallery.length];
    this.pushUndoSnapshot();
    this.redoStack = [];
    this.applyOrSendMutatingOp({
      kind: 'replace_snapshot',
      opId: this.createOpId(),
      playerId: this.localPlayerId,
      snapshot: selected.snapshot
    });
    if (this.galleryModalOpen) this.renderGalleryModal();
    this.setStatus(`Remixed gallery item ${this.galleryIndex + 1}/${gallery.length}.`);
  }

  private loadGallery(): SharedPotatoArtwork[] {
    try {
      const raw = window.localStorage.getItem(GALLERY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SharedPotatoArtwork[];
      const list = Array.isArray(parsed) ? parsed : [];
      return list.map((entry) => ({
        ...entry,
        authorId: typeof entry.authorId === 'string' ? entry.authorId : 'local'
      }));
    } catch {
      return [];
    }
  }

  private pruneGallery(gallery: SharedPotatoArtwork[]) {
    return gallery.filter((entry) => entry && typeof entry.id === 'string' && entry.snapshot && Array.isArray(entry.snapshot.strokes)).slice(0, 60);
  }

  private saveGallery(gallery: SharedPotatoArtwork[]) {
    const cleaned = this.pruneGallery(gallery);
    window.localStorage.setItem(GALLERY_KEY, JSON.stringify(cleaned));
    return cleaned;
  }

  private deleteSelectedShared() {
    const gallery = this.loadGallery();
    if (!gallery.length) {
      this.setStatus('Gallery is empty.');
      return;
    }
    const index = this.galleryIndex % gallery.length;
    const removed = gallery[index];
    const next = gallery.filter((_, idx) => idx !== index);
    const saved = this.saveGallery(next);
    this.galleryIndex = Math.max(0, Math.min(this.galleryIndex, saved.length - 1));
    this.renderGalleryButtons();
    if (this.galleryModalOpen) this.renderGalleryModal();
    this.setStatus(`Deleted shared entry by ${removed.authorId}.`);
  }

  private duplicateSelectedSharedToDraft() {
    const gallery = this.loadGallery();
    if (!gallery.length) {
      this.setStatus('Gallery is empty.');
      return;
    }
    const index = this.galleryIndex % gallery.length;
    const selected = gallery[index];
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(selected.snapshot));
    this.setStatus(`Duplicated shared #${index + 1} to draft.`);
  }

  private getGalleryViews() {
    const source = this.loadGallery().map((entry, sourceIndex) => ({ entry, sourceIndex }));
    const filtered = this.galleryModalFilter === 'mine' ? source.filter((row) => row.entry.authorId === this.localPlayerId) : source;
    const sorted = filtered.slice().sort((a, b) => {
      if (this.galleryModalSort === 'strokes') {
        return b.entry.snapshot.strokes.length - a.entry.snapshot.strokes.length;
      }
      if (this.galleryModalSort === 'stickers') {
        return b.entry.snapshot.stickers.length - a.entry.snapshot.stickers.length;
      }
      return b.entry.createdAt - a.entry.createdAt;
    });
    return sorted;
  }

  private toggleGallerySort() {
    this.galleryModalSort =
      this.galleryModalSort === 'recent' ? 'strokes' : this.galleryModalSort === 'strokes' ? 'stickers' : 'recent';
    this.galleryModalPage = 0;
    if (this.galleryModalOpen) this.renderGalleryModal();
  }

  private toggleGalleryFilter() {
    this.galleryModalFilter = this.galleryModalFilter === 'all' ? 'mine' : 'all';
    this.galleryModalPage = 0;
    if (this.galleryModalOpen) this.renderGalleryModal();
  }

  private stepGalleryPage(delta: number) {
    const pageSize = 12;
    const views = this.getGalleryViews();
    const pageCount = Math.max(1, Math.ceil(views.length / pageSize));
    this.galleryModalPage = Math.max(0, Math.min(pageCount - 1, this.galleryModalPage + delta));
    if (this.galleryModalOpen) this.renderGalleryModal();
  }

  private renderGalleryButtons() {
    this.galleryCards.forEach((node) => node.destroy());
    this.galleryCards = [];
    this.galleryButtons.forEach((button) => button.destroy());
    this.galleryButtons = [];
    const gallery = this.loadGallery();
    if (gallery.length && this.galleryIndex >= gallery.length) {
      this.galleryIndex = gallery.length - 1;
    }
    if (!gallery.length) {
      this.galleryIndex = 0;
    }
    const preview = gallery.slice(0, 6);
    const activePreviewKeys = new Set<string>();
    preview.forEach((entry, idx) => {
      const active = idx === this.galleryIndex;
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const cardX = 1012 + col * 88;
      const cardY = 12 + row * 53;
      const label = `${idx + 1}`;
      const bg = this.add
        .rectangle(cardX + 38, cardY + 22, 78, 44, active ? 0xbfdbfe : 0xfef3c7)
        .setStrokeStyle(2, active ? 0x2563eb : 0xd1a93b)
        .setDepth(13)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.galleryIndex = idx;
        const selected = gallery[idx];
        this.renderGalleryButtons();
        this.setStatus(`Selected gallery ${idx + 1}: ${new Date(selected.createdAt).toLocaleTimeString()}`);
      });
      this.galleryCards.push(bg);

      const previewKey = `potato-preview-${entry.id}`;
      activePreviewKeys.add(previewKey);
      this.galleryPreviewTextureKeys.add(previewKey);
      if (entry.previewDataUrl && this.textures.exists(previewKey)) {
        const image = this.add.image(cardX + 20, cardY + 22, previewKey).setDepth(14);
        const scale = Math.min(36 / image.width, 36 / image.height);
        image.setScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
        image.setInteractive({ useHandCursor: true });
        image.on('pointerdown', () => {
          this.galleryIndex = idx;
          this.renderGalleryButtons();
          this.remixSelected();
        });
        this.galleryCards.push(image);
      } else if (entry.previewDataUrl) {
        this.loadPreviewTexture(previewKey, entry.previewDataUrl);
      }

      const button = this.add
        .text(cardX + 60, cardY + 4, label, {
          color: active ? '#ffffff' : '#111827',
          backgroundColor: active ? '#2563eb' : '#fde68a',
          fontFamily: 'Arial',
          fontSize: '14px',
          padding: { left: 6, right: 6, top: 3, bottom: 3 }
        })
        .setDepth(14)
        .setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        this.galleryIndex = idx;
        const selected = gallery[idx];
        this.renderGalleryButtons();
        this.setStatus(`Selected gallery ${idx + 1}: ${new Date(selected.createdAt).toLocaleTimeString()}`);
      });
      this.galleryButtons.push(button);

      const info = this.add
        .text(cardX + 42, cardY + 16, `${entry.authorId.slice(0, 2)}\n${entry.snapshot.strokes.length}/${entry.snapshot.stickers.length}`, {
          color: active ? '#0f172a' : '#334155',
          backgroundColor: active ? '#bfdbfe' : '#fde68a',
          fontFamily: 'Arial',
          fontSize: '10px',
          padding: { left: 4, right: 4, top: 3, bottom: 3 },
          align: 'center'
        })
        .setDepth(14)
        .setInteractive({ useHandCursor: true });
      info.on('pointerdown', () => {
        this.galleryIndex = idx;
        this.renderGalleryButtons();
        this.setStatus(`Gallery ${idx + 1}: ${entry.snapshot.strokes.length} strokes, ${entry.snapshot.stickers.length} stickers.`);
      });
      this.galleryCards.push(info);
    });

    for (const key of [...this.galleryPreviewTextureKeys]) {
      if (activePreviewKeys.has(key)) continue;
      this.galleryPreviewTextureKeys.delete(key);
      this.pendingPreviewLoads.delete(key);
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
    }
  }

  private loadPreviewTexture(key: string, dataUrl: string) {
    if (this.pendingPreviewLoads.has(key)) return;
    if (this.textures.exists(key)) return;
    this.pendingPreviewLoads.add(key);

    const image = new window.Image();
    image.onload = () => {
      this.pendingPreviewLoads.delete(key);
      if (!this.sys.isActive()) return;
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      this.textures.addImage(key, image);
      this.renderGalleryButtons();
      if (this.galleryModalOpen) this.renderGalleryModal();
    };
    image.onerror = () => {
      this.pendingPreviewLoads.delete(key);
    };
    image.src = dataUrl;
  }

  private renderPngDataUrl(): string {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#f7f0df';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawTemplateToCanvas(ctx);

    for (const stroke of this.strokes) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.size + 4 : stroke.size;
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#f7f0df' : stroke.color;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let idx = 1; idx < stroke.points.length; idx += 1) ctx.lineTo(stroke.points[idx].x, stroke.points[idx].y);
      ctx.stroke();
      ctx.restore();
    }

    for (const sticker of this.stickerOps) {
      ctx.save();
      ctx.font = `${sticker.size}px Arial`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#111827';
      ctx.translate(sticker.x, sticker.y);
      ctx.rotate((sticker.rotationDeg * Math.PI) / 180);
      ctx.fillText(sticker.glyph, 0, 0);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  private drawTemplateToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = '#c19a6b';
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(POTATO_X, POTATO_Y, POTATO_W / 2, POTATO_H / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ba8d57';
    ctx.beginPath();
    ctx.ellipse(POTATO_X - 90, POTATO_Y + 26, 90, 75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(POTATO_X + 120, POTATO_Y - 44, 60, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private openColorPicker() {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = this.selectedColor;
    input.style.position = 'fixed';
    input.style.left = '-1000px';
    document.body.appendChild(input);
    input.addEventListener('input', () => {
      this.selectedColor = input.value;
      this.selectedTool = 'brush';
      this.setStatus(`Color: ${input.value}`);
    });
    input.addEventListener('change', () => {
      input.remove();
    });
    input.addEventListener('blur', () => {
      input.remove();
    });
    input.click();
  }

  private installKeyboardShortcuts() {
    this.input.keyboard?.on('keydown-B', () => {
      this.selectedTool = 'brush';
      this.setStatus('Tool: Brush');
    });
    this.input.keyboard?.on('keydown-E', () => {
      this.selectedTool = 'eraser';
      this.setStatus('Tool: Eraser');
    });
    this.input.keyboard?.on('keydown-OPEN_BRACKET', () => {
      this.brushSize = Math.max(2, this.brushSize - 2);
      this.setStatus(`Brush size ${this.brushSize}`);
    });
    this.input.keyboard?.on('keydown-CLOSE_BRACKET', () => {
      this.brushSize = Math.min(40, this.brushSize + 2);
      this.setStatus(`Brush size ${this.brushSize}`);
    });
    this.input.keyboard?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.undo();
    });
    this.input.keyboard?.on('keydown-Y', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.redo();
    });
    this.input.keyboard?.on('keydown-S', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        this.saveDraft();
      }
    });
    this.input.keyboard?.on('keydown-DELETE', () => this.deleteSelectedSticker());
    this.input.keyboard?.on('keydown-G', () => this.toggleGalleryModal());
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.galleryModalOpen) this.closeGalleryModal();
    });
  }

  private toggleGalleryModal() {
    if (this.galleryModalOpen) {
      this.closeGalleryModal();
      return;
    }
    this.openGalleryModal();
  }

  private openGalleryModal() {
    this.galleryModalOpen = true;
    this.renderGalleryModal();
  }

  private closeGalleryModal() {
    this.galleryModalOpen = false;
    this.clearGalleryModal();
  }

  private clearGalleryModal() {
    this.galleryModalNodes.forEach((node) => node.destroy());
    this.galleryModalNodes = [];
  }

  private renderGalleryModal() {
    this.clearGalleryModal();
    if (!this.galleryModalOpen) return;

    const views = this.getGalleryViews();
    const pageSize = 12;
    const pageCount = Math.max(1, Math.ceil(views.length / pageSize));
    this.galleryModalPage = Math.max(0, Math.min(pageCount - 1, this.galleryModalPage));
    if (!views.length) {
      this.galleryModalPage = 0;
      this.galleryIndex = 0;
    } else {
      const selectedPos = views.findIndex((row) => row.sourceIndex === this.galleryIndex);
      if (selectedPos >= 0) {
        const selectedPage = Math.floor(selectedPos / pageSize);
        if (selectedPage !== this.galleryModalPage) this.galleryModalPage = selectedPage;
      } else {
        this.galleryIndex = views[0].sourceIndex;
        this.galleryModalPage = 0;
      }
    }

    const backdrop = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x111827, 0.72).setDepth(90);
    backdrop.setInteractive({ useHandCursor: true });
    backdrop.on('pointerdown', () => this.closeGalleryModal());
    this.galleryModalNodes.push(backdrop);

    const panel = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1040, 560, 0xfffbeb).setDepth(91).setStrokeStyle(3, 0xd1a93b);
    panel.setInteractive();
    this.galleryModalNodes.push(panel);

    this.galleryModalNodes.push(
      this.add.text(150, 96, `Gallery (${views.length})`, {
        color: '#1f2937',
        fontFamily: 'Arial',
        fontSize: '28px'
      }).setDepth(92)
    );
    this.galleryModalNodes.push(
      this.addModalButton(510, 92, `Sort: ${this.galleryModalSort}`, () => this.toggleGallerySort()),
      this.addModalButton(630, 92, `Filter: ${this.galleryModalFilter}`, () => this.toggleGalleryFilter()),
      this.addModalButton(740, 92, 'Prev Pg', () => this.stepGalleryPage(-1)),
      this.addModalButton(815, 92, 'Next Pg', () => this.stepGalleryPage(1)),
      this.addModalButton(890, 92, 'Remix', () => this.remixSelected()),
      this.addModalButton(960, 92, 'Duplicate', () => this.duplicateSelectedSharedToDraft()),
      this.addModalButton(1042, 92, 'Delete', () => this.deleteSelectedShared()),
      this.addModalButton(1110, 92, 'Close', () => this.closeGalleryModal())
    );

    const start = this.galleryModalPage * pageSize;
    const visible = views.slice(start, start + pageSize);
    visible.forEach((view, slot) => {
      const col = slot % 4;
      const row = Math.floor(slot / 4);
      const x = 170 + col * 230;
      const y = 150 + row * 140;
      const active = view.sourceIndex === this.galleryIndex;
      const entry = view.entry;

      const cardBg = this.add.rectangle(x + 95, y + 58, 190, 116, active ? 0xbfdbfe : 0xfef3c7).setDepth(92).setStrokeStyle(2, active ? 0x2563eb : 0xd1a93b);
      cardBg.setInteractive({ useHandCursor: true });
      cardBg.on('pointerdown', () => {
        this.galleryIndex = view.sourceIndex;
        this.renderGalleryButtons();
        this.renderGalleryModal();
        this.setStatus(`Selected gallery ${view.sourceIndex + 1}.`);
      });
      this.galleryModalNodes.push(cardBg);

      const previewKey = `potato-preview-${entry.id}`;
      if (entry.previewDataUrl && this.textures.exists(previewKey)) {
        const image = this.add.image(x + 48, y + 56, previewKey).setDepth(93);
        const scale = Math.min(86 / image.width, 86 / image.height);
        image.setScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
        image.setInteractive({ useHandCursor: true });
        image.on('pointerdown', () => {
          this.galleryIndex = view.sourceIndex;
          this.renderGalleryButtons();
          this.renderGalleryModal();
        });
        this.galleryModalNodes.push(image);
      } else if (entry.previewDataUrl) {
        this.loadPreviewTexture(previewKey, entry.previewDataUrl);
      }

      this.galleryModalNodes.push(
        this.add.text(x + 95, y + 18, `${view.sourceIndex + 1}. ${entry.authorId.slice(0, 8)}`, {
          color: '#0f172a',
          fontFamily: 'Arial',
          fontSize: '13px'
        }).setDepth(93),
        this.add.text(x + 95, y + 40, `${entry.snapshot.strokes.length} strokes\n${entry.snapshot.stickers.length} stickers`, {
          color: '#334155',
          fontFamily: 'Arial',
          fontSize: '12px'
        }).setDepth(93)
      );
    });

    this.galleryModalNodes.push(
      this.add.text(150, 514, `Page ${this.galleryModalPage + 1}/${pageCount}`, {
        color: '#334155',
        fontFamily: 'Arial',
        fontSize: '14px'
      }).setDepth(93)
    );
  }

  private addModalButton(x: number, y: number, label: string, onClick: () => void) {
    const button = this.add
      .text(x, y, label, {
        color: '#111827',
        backgroundColor: '#fde68a',
        fontFamily: 'Arial',
        fontSize: '14px',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setDepth(92)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      onClick();
    });
    return button;
  }

  private normalizeDeg(value: number) {
    const wrapped = value % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  private isOnCanvas(x: number, y: number) {
    return y > TOOLBAR_HEIGHT && x >= 0 && x <= CANVAS_WIDTH && y <= CANVAS_HEIGHT;
  }

  private setStatus(message: string) {
    this.statusText.setText(message);
  }

  private initMultiplayer() {
    const mp = this.hooks.multiplayer;
    if (!mp) return;

    this.transport = new WebRtcDataTransport({
      role: mp.role,
      playerId: mp.playerId,
      roomCode: mp.roomCode,
      signalingUrl: mp.signalingUrl,
      reconnectToken: mp.reconnectToken
    });
    this.transport.onMessage((packet) => this.onTransportMessage(packet));
    this.transport.onState((peers) => {
      const connected = peers.filter((peer) => peer.connected).length;
      this.collabText.setText(`Collab: ${mp.role} | room ${mp.roomCode} | peers ${connected}`);
    });
    this.transport.connect();
  }

  private onTransportMessage(packet: TransportPacket) {
    const message = packet.message;

    if (message.type === 'ping' && this.role === 'client') {
      this.transport?.sendToHost(createProtocolMessage('pong', { pingId: message.pingId }));
      return;
    }
    if (message.type === 'pong') return;

    if (message.type === 'snapshot' && this.role === 'client') {
      const state = message.state as PotatoSnapshot;
      if (state && typeof state === 'object' && typeof state.revision === 'number') {
        if (state.revision >= this.snapshotRevision) this.applySnapshot(state);
      }
      return;
    }

    if (message.type === 'event') {
      const payload = message.event as { kind?: string; op?: PotatoNetOp };
      if (payload.kind === 'op' && payload.op) {
        this.applyIncomingOp(payload.op);
      }
      return;
    }

    if (message.type !== 'input' || this.role !== 'host') return;
    const input = message.input as { kind?: string; op?: PotatoNetOp };
    if (input.kind !== 'op' || !input.op) return;
    this.applyIncomingOp(input.op);
    this.transport?.broadcastFromHost(createProtocolMessage('event', { event: { kind: 'op', op: input.op } }));
  }

  private applyOrSendMutatingOp(op: PotatoNetOp) {
    this.applyIncomingOp(op);
    if (!this.transport) return;

    if (this.role === 'host') {
      this.transport.broadcastFromHost(createProtocolMessage('event', { event: { kind: 'op', op } }));
      return;
    }

    this.transport.sendToHost(
      createProtocolMessage('input', {
        playerId: this.localPlayerId,
        seq: this.opCounter++,
        input: { kind: 'op', op }
      })
    );
  }

  private applyIncomingOp(op: PotatoNetOp) {
    if (op.kind !== 'cursor') {
      if (this.appliedOpIds.has(op.opId)) return;
      this.appliedOpIds.add(op.opId);
      this.dirty = true;
      this.autosaveAccumulator = 0;
    }

    switch (op.kind) {
      case 'stroke_commit':
        this.strokes.push({
          tool: op.stroke.tool,
          color: op.stroke.color,
          size: op.stroke.size,
          points: op.stroke.points.map((point) => ({ x: point.x, y: point.y }))
        });
        this.snapshotRevision += 1;
        this.redraw();
        break;
      case 'sticker_add':
        this.stickerOps.push({ ...op.sticker });
        this.snapshotRevision += 1;
        this.redrawStickersOnly();
        break;
      case 'sticker_transform': {
        const sticker = this.stickerOps.find((entry) => entry.id === op.stickerId);
        if (sticker) {
          sticker.x = op.x;
          sticker.y = op.y;
          sticker.size = op.size;
          sticker.rotationDeg = op.rotationDeg;
          this.snapshotRevision += 1;
          this.redrawStickersOnly();
        }
        break;
      }
      case 'sticker_delete':
        this.stickerOps = this.stickerOps.filter((entry) => entry.id !== op.stickerId);
        if (this.selectedStickerId === op.stickerId) this.selectedStickerId = null;
        this.snapshotRevision += 1;
        this.redrawStickersOnly();
        break;
      case 'clear':
      case 'new_potato':
        this.strokes = [];
        this.stickerOps = [];
        this.selectedStickerId = null;
        this.snapshotRevision += 1;
        this.redraw();
        break;
      case 'replace_snapshot':
        this.applySnapshot(op.snapshot);
        this.snapshotRevision += 1;
        break;
      case 'cursor':
        this.updateCursor(op.playerId, op.x, op.y);
        break;
      default:
        break;
    }
  }

  private updateCursor(playerId: string, x: number, y: number) {
    if (playerId === this.localPlayerId) return;

    let node = this.cursorNodes.get(playerId);
    if (!node) {
      const dot = this.add.circle(0, 0, 7, 0x1d4ed8, 0.95);
      const label = this.add.text(10, -18, playerId.slice(0, 6), {
        color: '#1d4ed8',
        fontFamily: 'Arial',
        fontSize: '12px',
        backgroundColor: '#ffffff'
      });
      node = this.add.container(x, y, [dot, label]).setDepth(35);
      this.cursorLayer.add(node);
      this.cursorNodes.set(playerId, node);
    } else {
      node.setPosition(x, y);
    }
  }

  private broadcastCursor(x: number, y: number) {
    if (!this.transport || !this.role) return;
    this.cursorAccumulator += 1;
    if (this.cursorAccumulator % 2 !== 0) return;

    const op: PotatoNetOp = { kind: 'cursor', playerId: this.localPlayerId, x, y };
    this.applyIncomingOp(op);

    if (this.role === 'host') {
      this.transport.broadcastFromHost(createProtocolMessage('event', { event: { kind: 'op', op } }));
      return;
    }

    this.transport.sendToHost(
      createProtocolMessage('input', {
        playerId: this.localPlayerId,
        seq: this.opCounter++,
        input: { kind: 'op', op }
      })
    );
  }

  private broadcastSnapshot() {
    if (!this.transport || this.role !== 'host') return;
    this.transport.broadcastFromHost(
      createProtocolMessage('snapshot', {
        tick: Date.now(),
        state: this.snapshotNow()
      })
    );
  }

  private createOpId() {
    this.opCounter += 1;
    return `${this.localPlayerId}-${Date.now()}-${this.opCounter}`;
  }
}
