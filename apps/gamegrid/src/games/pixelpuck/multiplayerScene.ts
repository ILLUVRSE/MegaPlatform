import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { PixelPuckMultiplayerAdapter, type PixelPuckInput, type PixelPuckSnapshot } from '../../mp/adapters/pixelpuckAdapter';
import { createProtocolMessage, type InputMessage, type SnapshotMessage } from '../../mp/protocol';
import { WebRtcDataTransport } from '../../mp/transport';
import { computeContainSize } from '../../systems/scaleManager';
import { createFpsSampler } from '../../systems/perfMonitor';
import {
  createPointerController,
  setPointerDown,
  setPointerUp,
  updatePointerFilter,
  updatePointer,
  type PointerControllerState
} from './input';
import { getEffectsProfile, loadPixelPuckSettings, savePixelPuckSettings, type PixelPuckSettings } from './settings';
import { QualityTuner } from './quality';

interface PixelPuckMultiplayerSceneConfig {
  hooks: GameRuntimeHooks;
}


interface TrailDot {
  circle: Phaser.GameObjects.Arc;
  life: number;
}

const FIXED_DT = 1 / 60;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class PixelPuckMultiplayerScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private readonly adapter = new PixelPuckMultiplayerAdapter();

  private transport: WebRtcDataTransport | null = null;
  private pointerState: PointerControllerState = createPointerController();
  private targetInput: PixelPuckInput = { targetX: 640, targetY: 540, seq: 0 };
  private localSeq = 0;

  private settings: PixelPuckSettings = loadPixelPuckSettings();
  private effectsProfile = getEffectsProfile(this.settings.effects);
  private qualityTuner: QualityTuner | null = null;

  private board!: Phaser.GameObjects.Graphics;
  private boardGlow!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Rectangle;
  private puck!: Phaser.GameObjects.Arc;
  private bottomPaddle!: Phaser.GameObjects.Arc;
  private topPaddle!: Phaser.GameObjects.Arc;
  private puckShadow!: Phaser.GameObjects.Arc;
  private bottomShadow!: Phaser.GameObjects.Arc;
  private topShadow!: Phaser.GameObjects.Arc;
  private scoreText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private netText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private pauseContainer!: Phaser.GameObjects.Container;

  private trail: TrailDot[] = [];

  private hostSnapshotAccumulator = 0;
  private hostInputAccumulator = 0;
  private clientInputAccumulator = 0;
  private simAccumulator = 0;
  private latestSnapshot: PixelPuckSnapshot | null = null;
  private prevSnapshot: PixelPuckSnapshot | null = null;
  private snapshotAge = 0;

  private readyLocal = false;
  private readyRemote = false;
  private matchStarted = false;

  private fpsSample = 60;
  private fpsCleanup: (() => void) | null = null;
  private lastTelemetryMs = 0;

  constructor(config: PixelPuckMultiplayerSceneConfig) {
    super('pixelpuck-main');
    this.hooks = config.hooks;
  }

  create() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer) {
      this.add.text(24, 24, 'Missing multiplayer context', { color: '#ffb9b9', fontSize: '24px' });
      return;
    }

    this.board = this.add.graphics().setDepth(0);
    this.boardGlow = this.add.graphics().setDepth(1);
    this.vignette = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.22).setDepth(1.5).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.drawBoard();

    this.puckShadow = this.add.circle(640, 366, 16, 0x000000, 0.32).setDepth(2);
    this.puck = this.add.circle(640, 360, 18, 0xf6f7ff).setDepth(4);

    this.bottomShadow = this.add.circle(640, 568, 30, 0x000000, 0.32).setDepth(2);
    this.bottomPaddle = this.add.circle(640, 560, 34, 0x36d99f).setDepth(4);

    this.topShadow = this.add.circle(640, 168, 30, 0x000000, 0.32).setDepth(2);
    this.topPaddle = this.add.circle(640, 160, 34, 0xff6f79).setDepth(4);

    this.scoreText = this.add.text(640, 18, '0  -  0', { color: '#ffffff', fontSize: '36px', fontStyle: '700' }).setOrigin(0.5, 0);
    this.infoText = this.add.text(24, 92, 'Connecting party transport...', { color: '#add8ff', fontSize: '20px' });
    this.netText = this.add.text(24, 122, '', { color: '#97b8d9', fontSize: '16px' });

    this.pauseButton = this.add
      .text(1200, 16, 'Menu', { color: '#f5f7ff', fontSize: '18px', backgroundColor: '#1a2a3f' })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.pauseContainer.setVisible(true));

    this.createPauseUi();
    this.pauseContainer.setVisible(false);

    this.adapter.init({
      role: multiplayer.role,
      playerId: multiplayer.playerId,
      seed: multiplayer.seed,
      options: { hostPlayerId: multiplayer.hostId }
    });

    this.transport = new WebRtcDataTransport({
      role: multiplayer.role,
      playerId: multiplayer.playerId,
      roomCode: multiplayer.roomCode,
      signalingUrl: multiplayer.signalingUrl,
      reconnectToken: multiplayer.reconnectToken
    });

    this.transport.onMessage((packet) => {
      if (packet.message.type === 'input' && multiplayer.role === 'host') {
        this.adapter.onRemoteMessage(packet.message.input);
      }

      if (packet.message.type === 'snapshot' && multiplayer.role === 'client') {
        this.prevSnapshot = this.latestSnapshot;
        this.latestSnapshot = packet.message.state as PixelPuckSnapshot;
        this.snapshotAge = 0;
      }

      if (packet.message.type === 'event') {
        this.adapter.applyEvent(packet.message.event as { type: 'goal' | 'match_end' | 'rematch'; winner?: 'bottom' | 'top' | 'none' });
        if ((packet.message.event as { type: string }).type === 'match_end') {
          // match end handled by host stats
        }
      }

      if (packet.message.type === 'ready') {
        this.readyRemote = packet.message.ready;
        if (multiplayer.role === 'host') {
          if (this.matchStarted) {
            const snapshot = this.adapter.getSnapshot();
            this.transport?.broadcastFromHost(
              createProtocolMessage('snapshot', { tick: snapshot.tick, state: snapshot })
            );
          }
          this.maybeStartMatch();
        }
      }

      if (packet.message.type === 'start' && multiplayer.role === 'client') {
        this.matchStarted = true;
        this.adapter.start();
      }

      if (packet.message.type === 'ping' && multiplayer.role === 'client') {
        this.transport?.sendToHost(createProtocolMessage('pong', { pingId: packet.message.pingId }));
      }

      if (packet.message.type === 'pong' && multiplayer.role === 'host') {
        this.netText.setText(`Pong ${packet.message.pingId.slice(-6)}`);
      }
    });

    this.transport.onState((state) => {
      const connected = state.some((peer) => peer.connected);
      if (connected) {
        this.sendReady(this.readyLocal);
      }
    });

    this.transport.connect();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupTransport());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupTransport());
    this.scale?.on('resize', () => this.applyHudInsets());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const canvas = this.game.canvas as HTMLCanvasElement | undefined;
      if (canvas && pointer.event instanceof PointerEvent && canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(pointer.event.pointerId);
        } catch {
          // ignore
        }
      }
      setPointerDown(this.pointerState, pointer.id, pointer.x, pointer.y, performance.now());
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      updatePointer(this.pointerState, pointer.id, pointer.x, pointer.y, performance.now(), false);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      setPointerUp(this.pointerState, pointer.id);
    });

    this.infoText.setText(`Room ${multiplayer.roomCode} • Seed ${multiplayer.seed}`);

    this.buildTrail();

    this.qualityTuner = new QualityTuner(this.game, this.settings, (snapshot) => {
      this.effectsProfile = getEffectsProfile(snapshot.effects);
    });

    this.fpsCleanup = createFpsSampler((fps) => {
      this.fpsSample = fps;
    });

    this.applyHudInsets();
  }

  update(_time: number, deltaMs: number) {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer || !this.transport) return;

    const dt = Math.min(0.05, deltaMs / 1000);

    if (this.pointerState.active) {
      updatePointerFilter(this.pointerState, dt, this.settings.smoothing);
      const clamped = this.clampedInput({ targetX: this.pointerState.filteredX, targetY: this.pointerState.filteredY, seq: this.localSeq }, multiplayer.role !== 'host');
      this.targetInput = clamped;
    }

    if (multiplayer.role === 'host') {
      if (this.matchStarted) {
        this.adapter.onInput(this.clampedInput(this.targetInput, true));
        this.simAccumulator += dt;
        while (this.simAccumulator >= FIXED_DT) {
          const events = this.adapter.step(FIXED_DT);
          for (const event of events) {
            this.transport.broadcastFromHost(createProtocolMessage('event', { event: this.adapter.serializeEvent(event) }));
            if (event.type === 'match_end') {
              const result = this.adapter.getResult();
              this.hooks.reportEvent({
                type: 'game_end',
                gameId: this.hooks.gameId,
                mode: 'multiplayer',
                winner: result?.winner ?? 'none',
                score: result?.score ?? '0-0',
                durationMs: performance.now()
              });
            }
          }
          this.simAccumulator -= FIXED_DT;
        }
      }

      this.hostSnapshotAccumulator += dt;
      this.hostInputAccumulator += dt;
      if (this.hostSnapshotAccumulator >= 1 / 18) {
        this.hostSnapshotAccumulator = 0;
        const snapshot = this.adapter.getSnapshot();
        const snapshotMsg: SnapshotMessage = createProtocolMessage('snapshot', {
          tick: snapshot.tick,
          state: snapshot
        });
        this.transport.broadcastFromHost(snapshotMsg);
      }

      if (this.hostInputAccumulator >= 1.5) {
        this.hostInputAccumulator = 0;
        this.transport.ping();
      }
    } else {
      this.clientInputAccumulator += dt;
      if (this.clientInputAccumulator >= 1 / 30) {
        this.clientInputAccumulator = 0;
        const input = this.clampedInput(this.targetInput, false);
        this.transport.sendToHost(
          createProtocolMessage('input', {
            playerId: multiplayer.playerId,
            input: { ...input, seq: this.localSeq },
            seq: this.localSeq++
          } satisfies Omit<InputMessage, 'v' | 'type' | 'ts'>)
        );
      }

      if (this.latestSnapshot) {
        this.adapter.applySnapshot(this.latestSnapshot);
      }
    }

    this.renderFromSnapshot(dt, multiplayer.role);

    const stats = this.transport.getStats();
    this.netText.setText(`RTT ${stats.avgRttMs.toFixed(0)}ms • Loss ${(stats.packetLoss * 100).toFixed(0)}%`);
    const now = performance.now();
    if (now - this.lastTelemetryMs > 2000) {
      this.lastTelemetryMs = now;
      this.hooks.reportEvent({
        type: 'latency_sample',
        gameId: this.hooks.gameId,
        rttMs: stats.avgRttMs,
        packetLoss: stats.packetLoss
      });
    }

    const readyLabel = this.matchStarted ? 'Live' : `${this.readyLocal ? 'You ready' : 'Tap menu to ready'} • ${this.readyRemote ? 'Opponent ready' : 'Opponent waiting'}`;
    this.infoText.setText(readyLabel);

    if (this.qualityTuner) {
      this.qualityTuner.sampleFps(this.fpsSample, dt);
    }

    for (let i = 0; i < this.trail.length; i += 1) {
      const dot = this.trail[i];
      if (dot.life <= 0) continue;
      dot.life -= dt;
      const alpha = Math.max(0, dot.life / 0.18);
      dot.circle.setAlpha(alpha);
      if (dot.life <= 0) dot.circle.setVisible(false);
    }

    this.vignette.setVisible(this.effectsProfile.glow);
  }

  private cleanupTransport() {
    this.transport?.disconnect();
    this.transport = null;
    this.fpsCleanup?.();
    this.fpsCleanup = null;
  }

  private renderFromSnapshot(dt: number, role: 'host' | 'client') {
    const snapshot = this.adapter.getSnapshot();
    this.scoreText.setText(`${snapshot.score.bottom}  -  ${snapshot.score.top}`);

    if (role === 'host') {
      this.setPuck(snapshot.puck.x, snapshot.puck.y);
      this.setPaddle(this.bottomPaddle, this.bottomShadow, snapshot.paddles.bottom.x, snapshot.paddles.bottom.y);
      this.setPaddle(this.topPaddle, this.topShadow, snapshot.paddles.top.x, snapshot.paddles.top.y);
      return;
    }

    this.snapshotAge += dt;
    const interval = 1 / 18;
    const t = clamp(this.snapshotAge / interval, 0, 1);
    const prev = this.prevSnapshot ?? snapshot;
    const next = this.latestSnapshot ?? snapshot;

    const puckX = lerp(prev.puck.x, next.puck.x, t);
    const puckY = lerp(prev.puck.y, next.puck.y, t);
    const bottomX = lerp(prev.paddles.bottom.x, next.paddles.bottom.x, t);
    const bottomY = lerp(prev.paddles.bottom.y, next.paddles.bottom.y, t);
    const snapTopX = lerp(prev.paddles.top.x, next.paddles.top.x, t);
    const snapTopY = lerp(prev.paddles.top.y, next.paddles.top.y, t);
    const predicted = this.clampedInput(this.targetInput, false);
    const topX = lerp(predicted.targetX, snapTopX, 0.2);
    const topY = lerp(predicted.targetY, snapTopY, 0.2);

    this.setPuck(puckX, puckY);
    this.setPaddle(this.bottomPaddle, this.bottomShadow, bottomX, bottomY);
    this.setPaddle(this.topPaddle, this.topShadow, topX, topY);

    if (this.effectsProfile.trail && this.settings.trail) {
      const speed = Math.hypot(snapshot.puck.vx, snapshot.puck.vy);
      if (speed > 520) {
        this.spawnTrail(puckX, puckY);
      }
    }
  }

  private setPuck(x: number, y: number) {
    this.puck.setPosition(x, y);
    this.puckShadow.setPosition(x, y + 6);
  }

  private setPaddle(paddle: Phaser.GameObjects.Arc, shadow: Phaser.GameObjects.Arc, x: number, y: number) {
    paddle.setPosition(x, y);
    shadow.setPosition(x, y + 8);
  }

  private clampedInput(input: PixelPuckInput, bottomHalf: boolean): PixelPuckInput {
    const minX = 140 + 34;
    const maxX = 1140 - 34;
    const laneMid = (64 + 656) * 0.5;
    const minY = bottomHalf ? laneMid + 34 : 64 + 34;
    const maxY = bottomHalf ? 656 - 34 : laneMid - 34;

    return {
      targetX: clamp(input.targetX, minX, maxX),
      targetY: clamp(input.targetY, minY, maxY),
      seq: input.seq
    };
  }

  private sendReady(ready: boolean) {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer || !this.transport) return;
    const msg = createProtocolMessage('ready', { playerId: multiplayer.playerId, ready });
    if (multiplayer.role === 'host') {
      this.transport.broadcastFromHost(msg);
    } else {
      this.transport.sendToHost(msg);
    }
  }

  private maybeStartMatch() {
    const multiplayer = this.hooks.multiplayer;
    if (!multiplayer || multiplayer.role !== 'host') return;
    if (this.matchStarted) return;
    if (!this.readyLocal || !this.readyRemote) return;
    this.matchStarted = true;
    this.adapter.start();
    this.transport?.broadcastFromHost(createProtocolMessage('start', { gameId: this.hooks.gameId, seed: multiplayer.seed }));
  }

  private createPauseUi() {
    const panel = this.add.rectangle(640, 360, 520, 320, 0x0c1826, 0.94).setStrokeStyle(2, 0x2b4159, 1);
    const title = this.add.text(640, 270, 'Match Menu', { color: '#ffffff', fontSize: '30px' }).setOrigin(0.5);

    const ready = this.add
      .text(640, 320, this.readyLocal ? 'Ready' : 'Tap Ready', { color: '#051c12', backgroundColor: '#34d49f', fontSize: '22px' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.readyLocal = !this.readyLocal;
        ready.setText(this.readyLocal ? 'Ready' : 'Tap Ready');
        this.sendReady(this.readyLocal);
        this.maybeStartMatch();
      });

    const graphics = this.add
      .text(640, 362, `Graphics: ${this.settings.effects}`, { color: '#f2f6ff', backgroundColor: '#1f3047', fontSize: '18px' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const options: PixelPuckSettings['effects'][] = ['high', 'low', 'off'];
        const idx = options.indexOf(this.settings.effects);
        this.settings.effects = options[(idx + 1) % options.length];
        savePixelPuckSettings(this.settings);
        this.qualityTuner?.updateFromSettings(this.settings);
        graphics.setText(`Graphics: ${this.settings.effects}`);
      });

    const close = this.add
      .text(640, 406, 'Close', { color: '#f6f6ff', backgroundColor: '#2a3344', fontSize: '18px' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.pauseContainer.setVisible(false));

    const exit = this.add
      .text(640, 448, 'Leave Match', { color: '#f6f6ff', backgroundColor: '#3a304e', fontSize: '18px' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.pauseContainer = this.add.container(0, 0, [panel, title, ready, graphics, close, exit]).setDepth(20);
  }

  private drawBoard() {
    this.board.clear();
    this.boardGlow.clear();

    this.board.fillStyle(0x061421, 1);
    this.board.fillRect(0, 0, 1280, 720);

    this.board.fillGradientStyle(0x0c263b, 0x0d2338, 0x0f2d46, 0x0b2134, 1);
    this.board.fillRoundedRect(140, 64, 1000, 592, 48);

    this.board.lineStyle(22, 0x1e364b, 1);
    this.board.strokeRoundedRect(134, 58, 1012, 604, 56);

    this.board.lineStyle(4, 0x9fc9ff, 0.9);
    this.board.strokeRoundedRect(150, 74, 980, 572, 40);

    this.board.lineStyle(2, 0x5f8fc1, 0.7);
    this.board.lineBetween(170, 360, 1110, 360);

    this.board.fillStyle(0x6de5ff, 0.22);
    this.board.fillRoundedRect(500, 52, 280, 22, 10);
    this.board.fillRoundedRect(500, 646, 280, 22, 10);

    this.boardGlow.lineStyle(12, 0x274e6f, 0.8);
    this.boardGlow.strokeRoundedRect(138, 62, 1004, 596, 52);
  }

  private applyHudInsets() {
    const safe = this.readSafeAreaInsets();
    const size = computeContainSize(window.innerWidth, window.innerHeight);
    const scale = size.scale || 1;
    const inset = {
      top: safe.top / scale,
      left: safe.left / scale,
      right: safe.right / scale,
      bottom: safe.bottom / scale
    };

    const top = 12 + inset.top;
    this.scoreText.setPosition(640, top);
    this.infoText.setPosition(24 + inset.left, top + 70);
    this.netText.setPosition(24 + inset.left, top + 96);
    this.pauseButton.setPosition(1200 - inset.right, top + 4);
  }

  private readSafeAreaInsets() {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    const style = getComputedStyle(document.documentElement);
    const read = (name: string) => {
      const value = style.getPropertyValue(name);
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return {
      top: read('--safe-area-top'),
      right: read('--safe-area-right'),
      bottom: read('--safe-area-bottom'),
      left: read('--safe-area-left')
    };
  }

  private spawnTrail(x: number, y: number) {
    for (let i = 0; i < this.trail.length; i += 1) {
      const dot = this.trail[i];
      if (dot.life > 0) continue;
      dot.life = 0.18;
      dot.circle.setPosition(x, y);
      dot.circle.setVisible(true).setAlpha(0.5);
      return;
    }
  }

  private buildTrail() {
    for (let i = 0; i < 20; i += 1) {
      const circle = this.add.circle(-100, -100, 9, 0x9ad6ff, 0.3).setVisible(false).setAlpha(0).setDepth(3);
      this.trail.push({ circle, life: 0 });
    }
  }
}
