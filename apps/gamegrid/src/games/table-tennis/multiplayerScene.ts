import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { createProtocolMessage, type InputMessage } from '../../mp/protocol';
import { sanitizePayload } from '../../mp/serializer';
import { WebRtcDataTransport } from '../../mp/transport';
import {
  TableTennisMultiplayerAdapter,
  type TableTennisInput,
  type TableTennisMpEvent,
  type TableTennisMpMode,
  type TableTennisSnapshot
} from '../../mp/adapters/table-tennis';
import {
  applyButtonStyle,
  buildTextStyle,
  ensureDirectionalLinearTexture,
  ensureDirectionalSpecTexture,
  ensureNoiseTexture,
  ensureOuterVignetteTexture,
  ensurePaddleTexture,
  ensureRacketTexture,
  ensureVignetteTexture,
  snap,
  TABLE_TENNIS_THEME,
  tableMaskShape
} from './visualTheme';

interface TableTennisMultiplayerSceneConfig {
  hooks: GameRuntimeHooks;
}

interface MultiplayerUiEvent {
  type: 'rematch_ready' | 'return_to_room';
  playerIndex?: 0 | 1;
  ready?: boolean;
}

const SETTINGS_KEY = 'gamegrid.table-tennis.settings.v1';
const FIXED_STEP_S = 1 / 120;
const SNAPSHOT_RATE_S = 1 / 18;
const INPUT_SEND_RATE_S = 1 / 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseMultiplayerModeFromStorage(): TableTennisMpMode {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return 'quick_match';
    const parsed = JSON.parse(raw) as { mode?: string };
    return parsed.mode === 'best_of_3' ? 'best_of_3' : 'quick_match';
  } catch {
    return 'quick_match';
  }
}

function isMpUiEvent(value: unknown): value is MultiplayerUiEvent {
  if (!value || typeof value !== 'object') return false;
  const rec = value as { type?: unknown };
  return rec.type === 'rematch_ready' || rec.type === 'return_to_room';
}

function isTableTennisEvent(value: unknown): value is TableTennisMpEvent {
  if (!value || typeof value !== 'object') return false;
  const rec = value as { type?: unknown };
  return rec.type === 'point' || rec.type === 'match_end' || rec.type === 'rematch';
}

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class TableTennisMultiplayerScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private readonly adapter = new TableTennisMultiplayerAdapter();

  private transport: WebRtcDataTransport | null = null;

  private localControllingIndex: 0 | 1 | null = null;
  private isSpectator = false;

  private board!: Phaser.GameObjects.Graphics;
  private boardNoise!: Phaser.GameObjects.TileSprite;
  private boardVignette!: Phaser.GameObjects.Image;
  private boardDirectionalLinear!: Phaser.GameObjects.Image;
  private boardDirectionalSpec!: Phaser.GameObjects.Image;
  private outerVignette!: Phaser.GameObjects.Image;
  private ballSprite!: Phaser.GameObjects.Arc;
  private ballHighlight!: Phaser.GameObjects.Arc;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private bottomPaddle!: Phaser.GameObjects.Image;
  private topPaddle!: Phaser.GameObjects.Image;
  private bottomPaddleShadow!: Phaser.GameObjects.Ellipse;
  private topPaddleShadow!: Phaser.GameObjects.Ellipse;

  private scoreText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private netText!: Phaser.GameObjects.Text;

  private endContainer!: Phaser.GameObjects.Container;
  private endText!: Phaser.GameObjects.Text;
  private rematchButton!: Phaser.GameObjects.Text;

  private localInput: TableTennisInput = { targetX: 0, velX: 0 };
  private localSeq = 0;
  private lastPointerX = 640;
  private lastPointerAt = 0;

  private hostFixedAccumulator = 0;
  private hostSnapshotAccumulator = 0;
  private hostPingAccumulator = 0;
  private clientInputAccumulator = 0;

  private previousSnapshot: TableTennisSnapshot | null = null;
  private latestSnapshot: TableTennisSnapshot | null = null;
  private previousSnapshotAt = 0;
  private latestSnapshotAt = 0;

  private localDisplayX = 0;

  private ended = false;
  private debugNetHud = false;
  private rematchReady: [boolean, boolean] = [false, false];

  constructor(config: TableTennisMultiplayerSceneConfig) {
    super('table-tennis-main');
    this.hooks = config.hooks;
  }

  create() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer) {
      this.add.text(24, 24, 'Missing multiplayer context', { color: '#ffb9b9', fontSize: '24px' });
      return;
    }

    this.localControllingIndex = multiplayer.playerIndex === 0 || multiplayer.playerIndex === 1 ? multiplayer.playerIndex : null;
    this.isSpectator = this.localControllingIndex === null;
    this.debugNetHud = new URLSearchParams(window.location.search).get('debugNet') === '1';

    this.createBoard();
    this.createHud(multiplayer.roomCode);
    this.createEndOverlay();

    const mode = parseMultiplayerModeFromStorage();
    const playerIds = Array.isArray(multiplayer.playerIds) ? multiplayer.playerIds : [];

    this.adapter.init({
      role: multiplayer.role,
      playerId: multiplayer.playerId,
      seed: multiplayer.seed,
      options: {
        hostPlayerId: multiplayer.hostId,
        playerIndex: multiplayer.playerIndex,
        playerIds,
        mode
      }
    });
    this.adapter.start();

    this.localInput.targetX = 0;
    this.localDisplayX = 0;

    this.transport = new WebRtcDataTransport({
      role: multiplayer.role,
      playerId: multiplayer.playerId,
      roomCode: multiplayer.roomCode,
      signalingUrl: multiplayer.signalingUrl,
      reconnectToken: multiplayer.reconnectToken
    });

    this.transport.onMessage((packet) => {
      if (packet.message.type === 'input' && multiplayer.role === 'host') {
        this.adapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input as TableTennisInput });
      }

      if (packet.message.type === 'event') {
        const remoteEvent = packet.message.event;

        if (isMpUiEvent(remoteEvent)) {
          this.handleUiEvent(remoteEvent, packet.fromPlayerId);
          return;
        }

        if (isTableTennisEvent(remoteEvent)) {
          this.adapter.applyEvent(remoteEvent);
          if (remoteEvent.type === 'match_end') {
            this.ended = true;
            this.endContainer.setVisible(true);
          }
          if (remoteEvent.type === 'rematch') {
            this.ended = false;
            this.rematchReady = [false, false];
            this.endContainer.setVisible(false);
          }
        }
      }

      if (packet.message.type === 'snapshot' && multiplayer.role === 'client') {
        this.ingestSnapshot(packet.message.state as TableTennisSnapshot);
      }

      if (packet.message.type === 'ping' && multiplayer.role === 'client') {
        this.transport?.sendToHost(createProtocolMessage('pong', { pingId: packet.message.pingId }));
      }
    });

    this.transport.connect();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isSpectator) return;
      const now = performance.now();
      const targetX = this.screenToTableX(pointer.x);
      const dtMs = Math.max(1, now - this.lastPointerAt);
      const velX = ((pointer.x - this.lastPointerX) / 1.68) / (dtMs / 1000);

      this.lastPointerX = pointer.x;
      this.lastPointerAt = now;

      this.localInput.targetX = targetX;
      this.localInput.velX = clamp(velX, -780, 780);
      this.localInput.playerIndex = this.localControllingIndex ?? undefined;
      this.localDisplayX = targetX;
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isSpectator) return;
      this.lastPointerX = pointer.x;
      this.lastPointerAt = performance.now();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupTransport());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupTransport());

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.isSpectator ? 'multiplayer_spectator' : 'multiplayer',
      options: {
        playerIndex: multiplayer.playerIndex,
        matchMode: mode
      }
    });
  }

  update(_time: number, deltaMs: number) {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer || !this.transport) return;

    const dt = Math.min(0.05, deltaMs / 1000);

    if (multiplayer.role === 'host') {
      if (!this.isSpectator) {
        this.adapter.onInput(this.localInput);
      }

      this.hostFixedAccumulator += dt;
      while (this.hostFixedAccumulator >= FIXED_STEP_S) {
        this.hostFixedAccumulator -= FIXED_STEP_S;
        const events = this.adapter.step(FIXED_STEP_S);

        for (let i = 0; i < events.length; i += 1) {
          const event = events[i];
          this.transport.broadcastFromHost(createProtocolMessage('event', { event: sanitizePayload(this.adapter.serializeEvent(event)) }));

          if (event.type === 'match_end') {
            this.ended = true;
            this.endContainer.setVisible(true);

            const result = this.adapter.getResult();
            this.hooks.reportEvent({
              type: 'game_end',
              gameId: this.hooks.gameId,
              mode: 'multiplayer',
              winner: result?.winner ?? 'none',
              score: result?.score ?? '0-0',
              matchStats: {
                games: result?.games ?? '0-0',
                matchMode: result?.mode ?? 'quick_match'
              }
            });
          }
        }
      }

      this.hostSnapshotAccumulator += dt;
      if (this.hostSnapshotAccumulator >= SNAPSHOT_RATE_S) {
        this.hostSnapshotAccumulator = 0;
        const snapshot = this.adapter.getSnapshot();
        this.transport.broadcastFromHost(
          createProtocolMessage('snapshot', {
            tick: snapshot.tick,
            state: sanitizePayload(snapshot)
          })
        );
      }

      this.hostPingAccumulator += dt;
      if (this.hostPingAccumulator >= 1.5) {
        this.hostPingAccumulator = 0;
        this.transport.ping();
      }
    } else if (!this.isSpectator) {
      this.clientInputAccumulator += dt;
      if (this.clientInputAccumulator >= INPUT_SEND_RATE_S) {
        this.clientInputAccumulator = 0;
        this.transport.sendToHost(
          createProtocolMessage('input', {
            playerId: multiplayer.playerId,
            input: sanitizePayload({
              targetX: this.localInput.targetX,
              velX: this.localInput.velX,
              playerIndex: this.localControllingIndex,
              seq: this.localSeq
            }),
            seq: this.localSeq
          } satisfies Omit<InputMessage, 'v' | 'type' | 'ts'>)
        );
        this.localSeq += 1;
      }
    }

    this.renderFrame();

    if (this.debugNetHud) {
      const stats = this.transport.getStats();
      this.netText.setVisible(true);
      this.netText.setText(`RTT ${stats.avgRttMs.toFixed(0)}ms  Loss ${(stats.packetLoss * 100).toFixed(0)}%`);
    } else {
      this.netText.setVisible(false);
    }
  }

  private cleanupTransport() {
    this.transport?.disconnect();
    this.transport = null;
  }

  private createBoard() {
    this.board = this.add.graphics();
    this.outerVignette = this.add
      .image(640, 360, ensureOuterVignetteTexture(this))
      .setDisplaySize(1280, 720)
      .setAlpha(TABLE_TENNIS_THEME.background.vignetteAlpha)
      .setDepth(1.5);
    this.board.fillGradientStyle(
      TABLE_TENNIS_THEME.background.deepNavyTop,
      TABLE_TENNIS_THEME.background.deepNavyTop,
      TABLE_TENNIS_THEME.background.deepNavyBottom,
      TABLE_TENNIS_THEME.background.deepNavyBottom,
      1
    );
    this.board.fillRect(0, 0, 1280, 720);

    this.board.fillGradientStyle(
      TABLE_TENNIS_THEME.table.farColor,
      TABLE_TENNIS_THEME.table.farColor,
      TABLE_TENNIS_THEME.table.nearColor,
      TABLE_TENNIS_THEME.table.nearColor,
      1
    );
    this.board.fillRoundedRect(260, 124, 760, 560, 26);
    this.board.lineStyle(TABLE_TENNIS_THEME.table.lineWidth, TABLE_TENNIS_THEME.table.lineColor, TABLE_TENNIS_THEME.table.lineAlpha);
    this.board.strokeRoundedRect(260, 124, 760, 560, 26);

    this.board.lineStyle(TABLE_TENNIS_THEME.table.lineWidth, TABLE_TENNIS_THEME.table.lineColor, TABLE_TENNIS_THEME.table.lineAlpha * 0.9);
    this.board.beginPath();
    this.board.moveTo(640, 124.5);
    this.board.lineTo(640, 683.5);
    this.board.strokePath();

    this.board.beginPath();
    this.board.moveTo(260, 404.5);
    this.board.lineTo(1020, 404.5);
    this.board.strokePath();

    this.board.fillStyle(0x000000, TABLE_TENNIS_THEME.net.shadowAlpha);
    this.board.fillRect(270, 406, 740, TABLE_TENNIS_THEME.net.height);
    this.board.fillStyle(TABLE_TENNIS_THEME.net.color, TABLE_TENNIS_THEME.net.alpha);
    this.board.fillRect(270, 403, 740, TABLE_TENNIS_THEME.net.height);
    this.board.fillStyle(0xffffff, TABLE_TENNIS_THEME.net.highlightAlpha * 0.52);
    this.board.fillRect(270, 401, 740, 1);

    const mask = tableMaskShape(this);
    this.boardNoise = this.add
      .tileSprite(640, 404, TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height, ensureNoiseTexture(this))
      .setAlpha(0.035)
      .setDepth(4.25)
      .setMask(mask);
    this.boardVignette = this.add
      .image(640, 404, ensureVignetteTexture(this))
      .setDisplaySize(TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height)
      .setAlpha(0.42)
      .setDepth(4.5)
      .setMask(mask);
    this.boardDirectionalLinear = this.add
      .image(640, 404, ensureDirectionalLinearTexture(this))
      .setDisplaySize(TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height)
      .setAlpha(TABLE_TENNIS_THEME.lighting.directionalLinearAlpha)
      .setDepth(4.35)
      .setMask(mask);
    this.boardDirectionalSpec = this.add
      .image(640, 404, ensureDirectionalSpecTexture(this))
      .setDisplaySize(TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height)
      .setAlpha(TABLE_TENNIS_THEME.lighting.directionalSpecularAlpha)
      .setDepth(4.4)
      .setMask(mask);

    this.shadowSprite = this.add.ellipse(640, 470, 30, 12, 0x000000, TABLE_TENNIS_THEME.ball.shadowAlpha).setDepth(6);
    this.ballSprite = this.add
      .circle(640, 420, 9, TABLE_TENNIS_THEME.ball.base)
      .setStrokeStyle(1.5, TABLE_TENNIS_THEME.ball.rim, 0.95)
      .setDepth(9);
    this.ballHighlight = this.add.circle(636, 416, 2.4, TABLE_TENNIS_THEME.ball.highlight, 0.85).setDepth(10);

    ensurePaddleTexture(
      this,
      'tt-paddle-mp-bottom',
      138,
      16,
      TABLE_TENNIS_THEME.paddle.aiHighlight,
      TABLE_TENNIS_THEME.paddle.aiBase,
      TABLE_TENNIS_THEME.paddle.rim
    );
    ensurePaddleTexture(
      this,
      'tt-paddle-mp-top',
      132,
      14,
      TABLE_TENNIS_THEME.paddle.playerHighlight,
      TABLE_TENNIS_THEME.paddle.playerBase,
      TABLE_TENNIS_THEME.paddle.rim
    );
    ensureRacketTexture(
      this,
      'tt-paddle-mp-bottom-racket',
      TABLE_TENNIS_THEME.paddle.aiBase,
      TABLE_TENNIS_THEME.paddle.aiHighlight,
      TABLE_TENNIS_THEME.paddle.rim,
      0x4c7597
    );
    ensureRacketTexture(
      this,
      'tt-paddle-mp-top-racket',
      TABLE_TENNIS_THEME.paddle.playerBase,
      TABLE_TENNIS_THEME.paddle.playerHighlight,
      TABLE_TENNIS_THEME.paddle.rim,
      0xb77a52
    );
    this.bottomPaddleShadow = this.add.ellipse(640, 650, 74, 16, 0x000000, TABLE_TENNIS_THEME.paddle.shadowAlpha).setDepth(7);
    this.topPaddleShadow = this.add.ellipse(640, 163, 68, 14, 0x000000, TABLE_TENNIS_THEME.paddle.shadowAlpha).setDepth(7);
    this.bottomPaddle = this.add.image(640, 636, 'tt-paddle-mp-bottom-racket').setDepth(8);
    this.topPaddle = this.add.image(640, 170, 'tt-paddle-mp-top-racket').setDepth(8).setRotation(Math.PI);
  }

  private createHud(roomCode: string) {
    this.scoreText = this.add.text(640, 14, '', buildTextStyle(34, TABLE_TENNIS_THEME.ui.textPrimary, '600')).setOrigin(0.5, 0).setDepth(20);
    this.add.text(640, 52, `Room ${roomCode}`, buildTextStyle(13, TABLE_TENNIS_THEME.ui.textSecondary, '500')).setOrigin(0.5, 0).setDepth(20);
    this.stateText = this.add
      .text(640, 74, '', {
        ...buildTextStyle(12, TABLE_TENNIS_THEME.ui.textPrimary, '600'),
        backgroundColor: TABLE_TENNIS_THEME.ui.chipBg
      })
      .setPadding(10, 6, 10, 6)
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.hintText = this.add.text(640, 102, '', buildTextStyle(13, TABLE_TENNIS_THEME.ui.textMuted, '500')).setOrigin(0.5, 0).setDepth(20);
    this.netText = this.add.text(640, 128, '', buildTextStyle(12, TABLE_TENNIS_THEME.ui.textMuted, '500')).setOrigin(0.5, 0).setDepth(20).setVisible(false);

    this.scoreText.setText('Waiting for snapshots...');
    this.stateText.setText(this.isSpectator ? 'Spectator mode' : this.localControllingIndex === 0 ? 'You are Bottom Player' : 'You are Top Player');
    this.hintText.setText(this.isSpectator ? 'View-only. Host is authoritative.' : 'Drag left/right to position paddle.');
  }

  private createEndOverlay() {
    const panel = this.add.rectangle(640, 360, 560, 340, 0x091624, 0.94).setStrokeStyle(2, 0x376589);
    this.endText = this.add
      .text(640, 240, '', { ...buildTextStyle(23, TABLE_TENNIS_THEME.ui.textPrimary, '600'), align: 'center' })
      .setOrigin(0.5, 0);

    this.rematchButton = this.add
      .text(640, 470, 'Ready For Rematch', buildTextStyle(17, TABLE_TENNIS_THEME.ui.buttonPrimaryText, '600'))
      .setOrigin(0.5)
      .setPadding(20, 12, 20, 12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onRematchPressed());
    applyButtonStyle(this.rematchButton, 'primary');

    const backButton = this.add
      .text(640, 530, 'Back To Room', buildTextStyle(17, TABLE_TENNIS_THEME.ui.buttonSecondaryText, '600'))
      .setOrigin(0.5)
      .setPadding(18, 12, 18, 12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onBackToRoomPressed());
    applyButtonStyle(backButton, 'secondary');

    this.endContainer = this.add.container(0, 0, [panel, this.endText, this.rematchButton, backButton]).setDepth(61).setVisible(false);
  }

  private onRematchPressed() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer || this.localControllingIndex === null) return;

    if (multiplayer.role === 'host') {
      this.rematchReady[this.localControllingIndex] = true;
      const event: MultiplayerUiEvent = {
        type: 'rematch_ready',
        playerIndex: this.localControllingIndex,
        ready: true
      };
      this.transport?.broadcastFromHost(createProtocolMessage('event', { event }));
      this.maybeHostStartRematch();
      return;
    }

    this.transport?.sendToHost(
      createProtocolMessage('event', {
        event: {
          type: 'rematch_ready',
          playerIndex: this.localControllingIndex,
          ready: true
        } satisfies MultiplayerUiEvent
      })
    );
  }

  private onBackToRoomPressed() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer) return;

    if (multiplayer.role === 'host') {
      this.transport?.broadcastFromHost(createProtocolMessage('event', { event: { type: 'return_to_room' } satisfies MultiplayerUiEvent }));
      this.hooks.backToLobby();
      return;
    }

    this.hooks.backToLobby();
  }

  private handleUiEvent(event: MultiplayerUiEvent, fromPlayerId: string) {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer) return;

    if (event.type === 'return_to_room') {
      if (multiplayer.role === 'client') {
        this.hooks.backToLobby();
      }
      return;
    }

    if (event.type !== 'rematch_ready') return;

    if (event.playerIndex === 0 || event.playerIndex === 1) {
      this.rematchReady[event.playerIndex] = event.ready === true;
    }

    if (multiplayer.role === 'host' && fromPlayerId !== multiplayer.playerId) {
      const relay: MultiplayerUiEvent = {
        type: 'rematch_ready',
        playerIndex: event.playerIndex,
        ready: event.ready
      };
      this.transport?.broadcastFromHost(createProtocolMessage('event', { event: relay }));
      this.maybeHostStartRematch();
    }
  }

  private maybeHostStartRematch() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer || multiplayer.role !== 'host') return;
    if (!this.rematchReady[0] || !this.rematchReady[1]) return;

    const current = this.adapter.getSnapshot();
    const rematchEvent: TableTennisMpEvent = {
      type: 'rematch',
      eventId: current.lastEventId + 1,
      mode: current.match.mode
    };

    this.adapter.applyEvent(rematchEvent);
    this.adapter.start();

    this.transport?.broadcastFromHost(createProtocolMessage('event', { event: sanitizePayload(rematchEvent) }));
    const snapshot = this.adapter.getSnapshot();
    this.transport?.broadcastFromHost(createProtocolMessage('snapshot', { tick: snapshot.tick, state: sanitizePayload(snapshot) }));

    this.ended = false;
    this.rematchReady = [false, false];
    this.endContainer.setVisible(false);
  }

  private ingestSnapshot(snapshot: TableTennisSnapshot) {
    const now = performance.now();
    if (!this.latestSnapshot) {
      this.previousSnapshot = snapshot;
      this.latestSnapshot = snapshot;
      this.previousSnapshotAt = now;
      this.latestSnapshotAt = now;
      this.adapter.applySnapshot(snapshot);
      return;
    }

    this.previousSnapshot = this.latestSnapshot;
    this.previousSnapshotAt = this.latestSnapshotAt;
    this.latestSnapshot = snapshot;
    this.latestSnapshotAt = now;
    this.adapter.applySnapshot(snapshot);
  }

  private renderFrame() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer) return;

    const snapshot = multiplayer.role === 'host' ? this.adapter.getSnapshot() : this.latestSnapshot;
    if (!snapshot) return;

    const now = performance.now();
    let interpT = 1;
    let prev = this.previousSnapshot;
    let next = this.latestSnapshot;

    if (multiplayer.role === 'host') {
      prev = snapshot;
      next = snapshot;
      interpT = 1;
    } else if (prev && next) {
      const renderClock = now - 80;
      const span = Math.max(1, this.latestSnapshotAt - this.previousSnapshotAt);
      interpT = clamp((renderClock - this.previousSnapshotAt) / span, 0, 1);
    }

    const p = prev ?? snapshot;
    const n = next ?? snapshot;

    const bottomX = interpolate(p.paddles.bottom.x, n.paddles.bottom.x, interpT);
    const topX = interpolate(p.paddles.top.x, n.paddles.top.x, interpT);
    const ballX = interpolate(p.ball.x, n.ball.x, interpT);
    const ballY = interpolate(p.ball.y, n.ball.y, interpT);
    const ballZ = interpolate(p.ball.z, n.ball.z, interpT);

    const localAuthoritativeX = this.localControllingIndex === 0 ? bottomX : this.localControllingIndex === 1 ? topX : null;

    if (localAuthoritativeX !== null) {
      this.localDisplayX = interpolate(this.localDisplayX, localAuthoritativeX, 0.22);
      if (this.localControllingIndex === 0) {
        this.bottomPaddle.x = snap(this.worldToScreenX(this.localDisplayX));
        this.topPaddle.x = snap(interpolate(this.topPaddle.x, this.worldToScreenX(topX), 0.22));
      } else {
        this.topPaddle.x = snap(this.worldToScreenX(this.localDisplayX));
        this.bottomPaddle.x = snap(interpolate(this.bottomPaddle.x, this.worldToScreenX(bottomX), 0.22));
      }
    } else {
      this.bottomPaddle.x = snap(interpolate(this.bottomPaddle.x, this.worldToScreenX(bottomX), 0.2));
      this.topPaddle.x = snap(interpolate(this.topPaddle.x, this.worldToScreenX(topX), 0.2));
    }
    this.bottomPaddleShadow.x = this.bottomPaddle.x;
    this.topPaddleShadow.x = this.topPaddle.x;
    this.bottomPaddleShadow.y = 654;
    this.topPaddleShadow.y = 165;

    const ball = this.worldToScreen(ballX, ballY, ballZ);
    const shadow = this.worldToScreen(ballX, ballY, 0);

    this.ballSprite.x = snap(interpolate(this.ballSprite.x, ball.x, 0.34));
    this.ballSprite.y = snap(interpolate(this.ballSprite.y, ball.y, 0.34));
    const heightT = clamp(ballZ / 130, 0, 1);
    const speedT = clamp(Math.hypot(n.ball.vx, n.ball.vy) / 900, 0, 1);
    this.ballHighlight.x = this.ballSprite.x - (2.4 + heightT * 1.8);
    this.ballHighlight.y = this.ballSprite.y - (2.8 + heightT * 1.2);
    this.shadowSprite.x = snap(interpolate(this.shadowSprite.x, shadow.x + 2 + heightT, 0.28));
    this.shadowSprite.y = snap(interpolate(this.shadowSprite.y, shadow.y + 8 + heightT * 2, 0.28));

    const scale = clamp(0.86 + ballZ / 120, 0.78, 1.3);
    this.ballSprite.setScale(scale);
    this.ballHighlight.setScale(scale);
    this.shadowSprite.setScale(1 + heightT * 0.28 + speedT * 0.08, 1 + heightT * 0.22 + speedT * 0.06);
    const shadowAlpha = Phaser.Math.Linear(TABLE_TENNIS_THEME.ball.shadowAlphaNear, TABLE_TENNIS_THEME.ball.shadowAlphaFar, heightT);
    this.shadowSprite.setFillStyle(0x000000, shadowAlpha);

    const scoreLine = `${snapshot.score.bottom} - ${snapshot.score.top}`;
    const gamesLine = snapshot.match.mode === 'best_of_3' ? ` | Games ${snapshot.match.games.bottom}-${snapshot.match.games.top}` : '';
    this.scoreText.setText(scoreLine);

    const serverText = snapshot.server === 0 ? 'Bottom' : 'Top';
    this.stateText.setText(`You vs Rival • Server ${serverText}${gamesLine}`);
    this.hintText.setText(this.isSpectator ? 'Spectating live match.' : 'Drag left/right to position paddle.');

    if (this.ended || snapshot.match.phase === 'end') {
      this.ended = true;
      this.endContainer.setVisible(true);

      const result = this.adapter.getResult();
      const readyBottom = this.rematchReady[0] ? 'Ready' : 'Waiting';
      const readyTop = this.rematchReady[1] ? 'Ready' : 'Waiting';

      this.endText.setText(
        `Match Over\nWinner: ${result?.winner ?? 'n/a'}\nScore: ${result?.score ?? `${snapshot.score.bottom}-${snapshot.score.top}`}\nRematch: Bottom ${readyBottom} / Top ${readyTop}`
      );

      if (this.isSpectator) {
        this.rematchButton.setVisible(false);
      } else {
        this.rematchButton.setVisible(true);
      }
    }
  }

  private worldToScreen(x: number, y: number, z: number): { x: number; y: number } {
    return {
      x: this.worldToScreenX(x),
      y: 404 + y * 0.84 - z * 0.6
    };
  }

  private worldToScreenX(x: number): number {
    return 640 + x * 1.68;
  }

  private screenToTableX(screenX: number): number {
    return clamp((screenX - 640) / 1.68, -210, 210);
  }
}
