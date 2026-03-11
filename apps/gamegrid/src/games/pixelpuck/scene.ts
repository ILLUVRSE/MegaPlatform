import Phaser from 'phaser';
import { applyGoal, createInitialMatchState, formatTimer, tickMatchTimer } from './rules';
import { playTone, setGameCategoryVolume } from '../../systems/audioManager';
import { computeContainSize } from '../../systems/scaleManager';
import { createAiState, stepAi, type AiState } from './ai';
import {
  createPointerController,
  isSmashActive,
  setPointerDown,
  setPointerUp,
  smashCooldownRatio,
  stepPointerPhysics,
  updatePointer,
  type PointerControllerState
} from './input';
import { prefersReducedMotion } from '../../systems/gameplayComfort';
import { createFpsSampler } from '../../systems/perfMonitor';
import { getRinkById, loadRinks } from './rink';
import type { PaddleState, PixelPuckMatchState, PuckState, RinkGeometry } from './types';
import type { GameRuntimeHooks } from '../../game/modules';
import { createPhysicsScratch, DEFAULT_PHYSICS, stepPixelPuckPhysics } from './physics';
import {
  getEffectsProfile,
  loadPixelPuckSettings,
  savePixelPuckSettings,
  type PixelPuckSettings
} from './settings';
import { QualityTuner, type QualitySnapshot } from './quality';

interface PixelPuckSceneConfig {
  hooks: GameRuntimeHooks;
}

interface ImpactParticle {
  circle: Phaser.GameObjects.Arc;
  life: number;
}

interface TrailDot {
  circle: Phaser.GameObjects.Arc;
  life: number;
}

const FIXED_DT = 1 / 60;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function tintHex(base: number, mix: number, ratio: number) {
  const br = (base >> 16) & 255;
  const bg = (base >> 8) & 255;
  const bb = base & 255;
  const mr = (mix >> 16) & 255;
  const mg = (mix >> 8) & 255;
  const mb = mix & 255;
  const nr = Math.round(lerp(br, mr, ratio));
  const ng = Math.round(lerp(bg, mg, ratio));
  const nb = Math.round(lerp(bb, mb, ratio));
  return (nr << 16) | (ng << 8) | nb;
}

export class PixelPuckScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private rinks: RinkGeometry[] = [];
  private settings: PixelPuckSettings = loadPixelPuckSettings();
  private rink!: RinkGeometry;

  private match: PixelPuckMatchState = createInitialMatchState('first_to_7');
  private matchStartMs = 0;

  private puck: PuckState = { x: 640, y: 360, vx: 0, vy: 0, radius: 18 };
  private player: PaddleState = { x: 640, y: 560, vx: 0, vy: 0, radius: 34 };
  private ai: PaddleState = { x: 640, y: 180, vx: 0, vy: 0, radius: 34 };
  private aiState!: AiState;
  private pointerState: PointerControllerState = createPointerController();

  private prevPuck: PuckState = { x: 640, y: 360, vx: 0, vy: 0, radius: 18 };
  private prevPlayer: PaddleState = { x: 640, y: 560, vx: 0, vy: 0, radius: 34 };
  private prevAi: PaddleState = { x: 640, y: 180, vx: 0, vy: 0, radius: 34 };

  private rngSeed = 0.3141592;

  private boardGfx!: Phaser.GameObjects.Graphics;
  private boardGlow!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Rectangle;

  private puckShadow!: Phaser.GameObjects.Arc;
  private puckSprite!: Phaser.GameObjects.Arc;
  private puckRim!: Phaser.GameObjects.Arc;
  private puckHighlight!: Phaser.GameObjects.Arc;

  private playerShadow!: Phaser.GameObjects.Arc;
  private playerSprite!: Phaser.GameObjects.Arc;
  private playerRim!: Phaser.GameObjects.Arc;
  private playerHighlight!: Phaser.GameObjects.Arc;

  private aiShadow!: Phaser.GameObjects.Arc;
  private aiSprite!: Phaser.GameObjects.Arc;
  private aiRim!: Phaser.GameObjects.Arc;
  private aiHighlight!: Phaser.GameObjects.Arc;

  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private cooldownBar!: Phaser.GameObjects.Rectangle;
  private cooldownBg!: Phaser.GameObjects.Rectangle;
  private cooldownLabel!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private perfText!: Phaser.GameObjects.Text;

  private menuContainer!: Phaser.GameObjects.Container;
  private pauseContainer!: Phaser.GameObjects.Container;
  private endContainer!: Phaser.GameObjects.Container;
  private tutorialContainer!: Phaser.GameObjects.Container;
  private notificationText!: Phaser.GameObjects.Text;

  private impacts: ImpactParticle[] = [];
  private trail: TrailDot[] = [];

  private accumulator = 0;
  private pausedByGame = false;
  private inCountdown = false;
  private countdownTimer = 0;
  private countdownValue = 3;
  private tutorialTimer = 0;

  private hudInset = { top: 0, left: 0, right: 0, bottom: 0 };
  private lastHudEmitMs = 0;
  private playerBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  private effectsProfile = getEffectsProfile(this.settings.effects);
  private qualityTuner: QualityTuner | null = null;
  private qualitySnapshot: QualitySnapshot | null = null;

  private fpsSample = 60;
  private fpsCleanup: (() => void) | null = null;
  private readonly physicsScratch = createPhysicsScratch();
  private readonly physicsSettings = { ...DEFAULT_PHYSICS };

  private readonly hitLimiter = new Map<string, number>();

  constructor(config: PixelPuckSceneConfig) {
    super('pixelpuck-main');
    this.hooks = config.hooks;
  }

  create() {
    setGameCategoryVolume(this.hooks.gameId, 'sfx', 1);

    this.rinks = loadRinks();
    this.rink = getRinkById(this.settings.rinkId);
    this.aiState = createAiState(this.rink);

    this.boardGfx = this.add.graphics().setDepth(0);
    this.boardGlow = this.add.graphics().setDepth(1);
    this.vignette = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.22).setDepth(1.5);
    this.vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.puckShadow = this.add.circle(this.puck.x, this.puck.y + 6, this.puck.radius * 0.92, 0x000000, 0.35).setDepth(2);
    this.puckSprite = this.add.circle(this.puck.x, this.puck.y, this.puck.radius, 0xf8fbff).setDepth(4);
    this.puckRim = this.add.circle(this.puck.x, this.puck.y, this.puck.radius, 0xdce7ff, 0.35).setDepth(4.1);
    this.puckHighlight = this.add.circle(this.puck.x - 4, this.puck.y - 5, this.puck.radius * 0.42, 0xffffff, 0.8).setDepth(4.2);

    this.playerShadow = this.add.circle(this.player.x, this.player.y + 8, this.player.radius * 0.95, 0x000000, 0.35).setDepth(2);
    this.playerSprite = this.add.circle(this.player.x, this.player.y, this.player.radius, 0x28d3a1).setDepth(4);
    this.playerRim = this.add.circle(this.player.x, this.player.y, this.player.radius, 0x1aa27c, 0.5).setDepth(4.1);
    this.playerHighlight = this.add.circle(this.player.x - 6, this.player.y - 7, this.player.radius * 0.4, 0xffffff, 0.4).setDepth(4.2);

    this.aiShadow = this.add.circle(this.ai.x, this.ai.y + 8, this.ai.radius * 0.95, 0x000000, 0.35).setDepth(2);
    this.aiSprite = this.add.circle(this.ai.x, this.ai.y, this.ai.radius, 0xff6d7a).setDepth(4);
    this.aiRim = this.add.circle(this.ai.x, this.ai.y, this.ai.radius, 0xd85263, 0.5).setDepth(4.1);
    this.aiHighlight = this.add.circle(this.ai.x - 6, this.ai.y - 7, this.ai.radius * 0.4, 0xffffff, 0.4).setDepth(4.2);

    this.scoreText = this.add.text(640, 18, '0  -  0', { color: '#ffffff', fontSize: '40px', fontStyle: '700' }).setOrigin(0.5, 0);
    this.timerText = this.add.text(640, 64, '--:--', { color: '#c9dbff', fontSize: '22px' }).setOrigin(0.5, 0);

    this.statusText = this.add.text(24, 94, '', { color: '#dbe9ff', fontSize: '20px' });

    this.cooldownBg = this.add.rectangle(24, 32, 140, 16, 0x0d1b28, 0.8).setOrigin(0, 0.5);
    this.cooldownBar = this.add.rectangle(24, 32, 140, 16, 0x3ddfa9).setOrigin(0, 0.5);
    this.cooldownLabel = this.add.text(24, 12, 'Smash', { color: '#bfffe8', fontSize: '14px' });

    this.pauseButton = this.add
      .text(1200, 16, 'Pause', { color: '#f5f7ff', fontSize: '18px', backgroundColor: '#1a2a3f' })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.togglePause(true);
      });

    this.perfText = this.add.text(20, 130, '', { color: '#8bc5ff', fontSize: '14px' }).setVisible(import.meta.env.DEV);

    this.notificationText = this.add.text(640, 680, '', { color: '#ffffff', fontSize: '20px', backgroundColor: '#1a2330' })
      .setOrigin(0.5)
      .setPadding(12, 8, 12, 8)
      .setVisible(false)
      .setDepth(10);

    this.createMenuUi();
    this.createPauseUi();
    this.createEndUi();
    this.createTutorialUi();

    this.endContainer.setVisible(false);
    this.pauseContainer.setVisible(false);
    this.tutorialContainer.setVisible(false);

    this.buildParticles();
    this.buildTrail();
    this.drawRink();
    this.resetRound(true);
    this.applyHudInsets();
    this.applyPhysicsSettings();
    this.updatePlayerBounds();

    this.events.on('pause', () => {
      this.pausedByGame = true;
    });
    this.events.on('resume', () => {
      this.pausedByGame = false;
    });
    this.scale?.on('resize', () => this.applyHudInsets());

    this.input?.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const canvas = this.game.canvas as HTMLCanvasElement | undefined;
      if (canvas && pointer.event instanceof PointerEvent && canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(pointer.event.pointerId);
        } catch {
          // Ignore capture failures.
        }
      }
      setPointerDown(this.pointerState, pointer.id, pointer.x, pointer.y, performance.now());
    });

    this.input?.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      updatePointer(this.pointerState, pointer.id, pointer.x, pointer.y, performance.now(), this.settings.powerSmash);
    });

    this.input?.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      setPointerUp(this.pointerState, pointer.id);
    });

    window.addEventListener('blur', this.handleWindowBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.shutdown());

    this.qualityTuner = new QualityTuner(this.game, this.settings, (snapshot) => {
      this.qualitySnapshot = snapshot;
      this.effectsProfile = getEffectsProfile(snapshot.effects);
      this.hooks.reportEvent({
        type: 'quality_update',
        gameId: this.hooks.gameId,
        effects: snapshot.effects,
        dpr: snapshot.appliedDpr
      });
    });

    this.fpsCleanup = createFpsSampler((fps) => {
      this.fpsSample = fps;
    });
  }

  shutdown() {
    window.removeEventListener('blur', this.handleWindowBlur);
    this.fpsCleanup?.();
    this.fpsCleanup = null;
  }

  update(_time: number, deltaMs: number) {
    const dtSec = Math.min(0.05, deltaMs / 1000);
    this.accumulator += dtSec;

    while (this.accumulator >= FIXED_DT) {
      this.snapshotPrev();
      this.fixedStep(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    const alpha = clamp(this.accumulator / FIXED_DT, 0, 1);
    this.render(alpha);

    if (import.meta.env.DEV && this.perfText.visible) {
      const dpr = this.qualitySnapshot?.appliedDpr ?? window.devicePixelRatio;
      const effects = this.qualitySnapshot?.effects ?? this.settings.effects;
      this.perfText.setText(`FPS ${this.fpsSample} | ${Math.round(1000 / Math.max(1, this.fpsSample))}ms | DPR ${dpr.toFixed(2)} | FX ${effects}`);
    }

    this.qualityTuner?.sampleFps(this.fpsSample, dtSec);

    for (let i = 0; i < this.impacts.length; i += 1) {
      const particle = this.impacts[i];
      if (particle.life <= 0) continue;
      particle.life -= dtSec;
      const alphaImpact = Math.max(0, particle.life / 0.24);
      particle.circle.setAlpha(alphaImpact);
      if (particle.life <= 0) {
        particle.circle.setVisible(false);
      }
    }

    for (let i = 0; i < this.trail.length; i += 1) {
      const dot = this.trail[i];
      if (dot.life <= 0) continue;
      dot.life -= dtSec;
      const alphaTrail = Math.max(0, dot.life / 0.18);
      dot.circle.setAlpha(alphaTrail);
      if (dot.life <= 0) {
        dot.circle.setVisible(false);
      }
    }

    if (this.tutorialContainer.visible) {
      this.tutorialTimer -= dtSec;
      if (this.tutorialTimer <= 0) {
        this.tutorialContainer.setVisible(false);
      }
    }
  }

  private snapshotPrev() {
    this.prevPuck.x = this.puck.x;
    this.prevPuck.y = this.puck.y;
    this.prevPuck.vx = this.puck.vx;
    this.prevPuck.vy = this.puck.vy;

    this.prevPlayer.x = this.player.x;
    this.prevPlayer.y = this.player.y;
    this.prevPlayer.vx = this.player.vx;
    this.prevPlayer.vy = this.player.vy;

    this.prevAi.x = this.ai.x;
    this.prevAi.y = this.ai.y;
    this.prevAi.vx = this.ai.vx;
    this.prevAi.vy = this.ai.vy;
  }

  private fixedStep(dt: number) {
    if (this.pausedByGame || this.menuContainer.visible || this.endContainer.visible || this.pauseContainer.visible) return;

    if (this.inCountdown) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.countdownTimer = 1;
        this.countdownValue -= 1;
        this.playCountdownTick();
        if (this.countdownValue <= 0) {
          this.inCountdown = false;
          this.statusText.setText('');
          this.launchPuck();
        }
      }
      return;
    }

    if (this.match.config.mode === 'timed') {
      this.match = tickMatchTimer(this.match, dt * 1000);
      if (this.match.ended) {
        this.finishMatch();
        return;
      }
    }

    const now = performance.now();

    if (this.pointerState.active) {
      const targetX = this.pointerState.targetX;
      const targetY = this.pointerState.targetY;
      const bounds = this.getPlayerBounds();
      const clamped = {
        x: clamp(targetX, bounds.minX, bounds.maxX),
        y: clamp(targetY, bounds.minY, bounds.maxY)
      };
      stepPointerPhysics(
        this.pointerState,
        this.player,
        clamped.x,
        clamped.y,
        dt,
        this.settings.sensitivity,
        this.settings.assist,
        this.settings.sticky,
        this.settings.smoothing
      );
    } else {
      this.player.vx *= 0.86;
      this.player.vy *= 0.86;
    }

    this.enforcePlayerBounds();

    if (this.match.config.mode !== 'practice') {
      this.aiState = stepAi(this.ai, this.puck, this.rink, this.settings.difficulty, this.aiState, dt, this.nextRand());
    }

    stepPixelPuckPhysics(
      this.puck,
      { bottom: this.player, top: this.ai },
      this.rink,
      dt,
      this.physicsSettings,
      this.physicsScratch,
      isSmashActive(this.pointerState, now) && this.settings.powerSmash
    );

    if (this.physicsScratch.goal) {
      this.onGoalScored(this.physicsScratch.goal === 'bottom' ? 'player' : 'ai');
      return;
    }

    if (this.effectsProfile.impacts) {
      for (let i = 0; i < this.physicsScratch.impacts.length; i += 1) {
        const impact = this.physicsScratch.impacts[i];
        this.spawnImpact(impact.x, impact.y, impact.smash ? 0xfff08a : impact.kind === 'rail' ? 0x8fd3ff : 0xffffff);
        if (impact.kind === 'paddle') {
          this.playPuckHit(Boolean(impact.smash), impact.strength);
          if (this.settings.haptics) this.triggerHaptic(impact.smash ? [10, 10, 20] : 12);
          if (this.settings.screenShake && this.effectsProfile.screenShake && impact.strength > 0.65) {
            this.shakeCamera(80, 0.004);
          }
        } else if (impact.kind === 'rail' || impact.kind === 'obstacle') {
          this.playWallHit(impact.strength);
          if (this.settings.haptics && impact.strength > 0.5) this.triggerHaptic(8);
        }
      }
    }
  }

  private render(alpha: number) {
    const puckX = lerp(this.prevPuck.x, this.puck.x, alpha);
    const puckY = lerp(this.prevPuck.y, this.puck.y, alpha);
    const playerX = lerp(this.prevPlayer.x, this.player.x, alpha);
    const playerY = lerp(this.prevPlayer.y, this.player.y, alpha);
    const aiX = lerp(this.prevAi.x, this.ai.x, alpha);
    const aiY = lerp(this.prevAi.y, this.ai.y, alpha);

    this.puckShadow.setPosition(puckX, puckY + 6);
    this.puckSprite.setPosition(puckX, puckY);
    this.puckRim.setPosition(puckX, puckY);
    this.puckHighlight.setPosition(puckX - 4, puckY - 5);

    this.playerShadow.setPosition(playerX, playerY + 8);
    this.playerSprite.setPosition(playerX, playerY);
    this.playerRim.setPosition(playerX, playerY);
    this.playerHighlight.setPosition(playerX - 6, playerY - 7);

    this.aiShadow.setPosition(aiX, aiY + 8);
    this.aiSprite.setPosition(aiX, aiY);
    this.aiRim.setPosition(aiX, aiY);
    this.aiHighlight.setPosition(aiX - 6, aiY - 7);

    if (this.effectsProfile.trail && this.settings.trail) {
      const speed = Math.hypot(this.puck.vx, this.puck.vy);
      if (speed > 520) {
        this.spawnTrail(puckX, puckY, clamp(speed / 1600, 0.35, 1));
      }
    }

    this.refreshUi();
    this.updateCooldownBar();
    this.updateVignette();
  }

  private refreshUi() {
    this.scoreText.setText(`${this.match.scores.player}  -  ${this.match.scores.ai}`);
    this.timerText.setText(formatTimer(this.match));

    if (this.inCountdown) {
      this.statusText.setText(String(this.countdownValue));
    } else if (this.match.suddenDeath) {
      this.statusText.setText('Sudden Death');
    } else {
      this.statusText.setText(this.match.config.mode === 'practice' ? 'Practice Mode' : '');
    }

    const now = performance.now();
    if (now - this.lastHudEmitMs > 250) {
      this.lastHudEmitMs = now;
      this.hooks.reportEvent({
        type: 'hud_update',
        gameId: this.hooks.gameId,
        score: `${this.match.scores.player}:${this.match.scores.ai}`,
        timer: formatTimer(this.match)
      });
    }
  }

  private updateCooldownBar() {
    const ratio = this.settings.powerSmash ? smashCooldownRatio(this.pointerState) : 0;
    this.cooldownBar.displayWidth = 140 * ratio;
    this.cooldownBar.setFillStyle(this.settings.powerSmash ? 0x4de3b1 : 0x3b3f49);
  }

  private updateVignette() {
    if (!this.effectsProfile.glow) {
      this.vignette.setVisible(false);
      this.boardGlow.setVisible(false);
      return;
    }
    this.vignette.setVisible(true);
    this.boardGlow.setVisible(true);
  }

  private onGoalScored(scorer: 'player' | 'ai') {
    this.playGoal();
    if (this.settings.haptics) this.triggerHaptic([15, 25, 15]);
    if (this.effectsProfile.glow) {
      this.flashCamera(160, 120, 200, 255);
    }
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1, to: 1.18 },
      duration: 140,
      yoyo: true
    });

    if (this.match.config.mode !== 'practice') {
      this.match = applyGoal(this.match, scorer);
      if (this.match.ended) {
        this.finishMatch();
        return;
      }
    }

    this.resetRound(false);
    this.notify(`${scorer === 'player' ? 'You scored!' : 'Opponent scored'}`);
  }

  private finishMatch() {
    this.endContainer.setVisible(true);
    const winnerText = this.match.winner === 'none' ? 'Draw' : this.match.winner === 'player' ? 'You Win' : 'AI Wins';
    const durationMs = performance.now() - this.matchStartMs;

    const label = this.endContainer.list[1] as Phaser.GameObjects.Text;
    label.setText(`${winnerText}\n${this.match.scores.player} - ${this.match.scores.ai}`);

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      winner: this.match.winner,
      score: `${this.match.scores.player}-${this.match.scores.ai}`,
      mode: this.match.config.mode,
      durationMs
    });

    this.playWin();
    if (this.settings.haptics) this.triggerHaptic([20, 40, 20, 40, 20]);
  }

  private resetRound(firstBoot: boolean) {
    const centerX = this.rink.bounds.x + this.rink.bounds.width * 0.5;
    const centerY = this.rink.bounds.y + this.rink.bounds.height * 0.5;

    this.puck.x = centerX;
    this.puck.y = centerY;
    this.puck.vx = 0;
    this.puck.vy = 0;

    this.player.x = centerX;
    this.player.y = this.rink.bounds.y + this.rink.bounds.height * 0.84;
    this.player.vx = 0;
    this.player.vy = 0;

    this.ai.x = centerX;
    this.ai.y = this.rink.bounds.y + this.rink.bounds.height * 0.16;
    this.ai.vx = 0;
    this.ai.vy = 0;

    this.inCountdown = true;
    this.countdownValue = 3;
    this.countdownTimer = firstBoot ? 0.6 : 1;
    this.statusText.setText('3');

    if (!this.settings.tutorialSeen) {
      this.tutorialContainer.setVisible(true);
      this.tutorialTimer = 12;
      this.settings.tutorialSeen = true;
      savePixelPuckSettings(this.settings);
    }
  }

  private launchPuck() {
    const angle = (this.nextRand() - 0.5) * 0.8;
    const speed = 680;
    const dir = this.nextRand() > 0.5 ? 1 : -1;
    this.puck.vx = Math.sin(angle) * speed;
    this.puck.vy = Math.cos(angle) * speed * dir;
  }

  private enforcePlayerBounds() {
    const bounds = this.getPlayerBounds();
    if (this.settings.assist) {
      this.player.x = clamp(this.player.x, bounds.minX, bounds.maxX);
      this.player.y = clamp(this.player.y, bounds.minY, bounds.maxY);
    } else {
      if (this.player.x < bounds.minX || this.player.x > bounds.maxX) this.player.vx *= -0.35;
      if (this.player.y < bounds.minY || this.player.y > bounds.maxY) this.player.vy *= -0.35;
      this.player.x = clamp(this.player.x, bounds.minX, bounds.maxX);
      this.player.y = clamp(this.player.y, bounds.minY, bounds.maxY);
    }
  }

  private getPlayerBounds() {
    return this.playerBounds;
  }

  private updatePlayerBounds() {
    this.playerBounds.minX = this.rink.bounds.x + this.player.radius;
    this.playerBounds.maxX = this.rink.bounds.x + this.rink.bounds.width - this.player.radius;
    this.playerBounds.minY = this.rink.bounds.y + this.rink.bounds.height * 0.5 + this.player.radius;
    this.playerBounds.maxY = this.rink.bounds.y + this.rink.bounds.height - this.player.radius;
  }

  private buildParticles() {
    for (let i = 0; i < 22; i += 1) {
      const circle = this.add.circle(-100, -100, 8, 0xffffff).setVisible(false).setAlpha(0).setDepth(6);
      this.impacts.push({ circle, life: 0 });
    }
  }

  private buildTrail() {
    for (let i = 0; i < 26; i += 1) {
      const circle = this.add.circle(-100, -100, 10, 0x9ad6ff, 0.35).setVisible(false).setAlpha(0).setDepth(3);
      this.trail.push({ circle, life: 0 });
    }
  }

  private spawnImpact(x: number, y: number, color: number) {
    for (let i = 0; i < this.impacts.length; i += 1) {
      const particle = this.impacts[i];
      if (particle.life > 0) continue;
      particle.life = 0.24;
      particle.circle.setFillStyle(color, 1);
      particle.circle.setPosition(x, y);
      particle.circle.setVisible(true).setAlpha(1);
      return;
    }
  }

  private spawnTrail(x: number, y: number, intensity: number) {
    for (let i = 0; i < this.trail.length; i += 1) {
      const dot = this.trail[i];
      if (dot.life > 0) continue;
      dot.life = 0.18;
      dot.circle.setPosition(x, y);
      dot.circle.setFillStyle(tintHex(0x9ad6ff, 0xffffff, intensity), 0.2 + intensity * 0.4);
      dot.circle.setVisible(true).setAlpha(0.5 + intensity * 0.3);
      return;
    }
  }

  private createMenuUi() {
    const panel = this.add.rectangle(640, 360, 560, 560, 0x0b1624, 0.94).setStrokeStyle(2, 0x2b4159, 1);
    const title = this.add.text(640, 154, 'PixelPuck', { color: '#ffffff', fontSize: '42px' }).setOrigin(0.5);
    const subtitle = this.add.text(640, 194, 'Professional Air Hockey', { color: '#9fc5ff', fontSize: '18px' }).setOrigin(0.5);

    const mode = this.makeOptionRow(640, 240, 'Mode', () => {
      const options: PixelPuckSettings['mode'][] = ['first_to_7', 'timed', 'practice'];
      const index = options.indexOf(this.settings.mode);
      this.settings.mode = options[(index + 1) % options.length];
      savePixelPuckSettings(this.settings);
      mode.setText(`Mode: ${this.settings.mode}`);
    });
    mode.setText(`Mode: ${this.settings.mode}`);

    const difficulty = this.makeOptionRow(640, 280, 'Difficulty', () => {
      const options: PixelPuckSettings['difficulty'][] = ['easy', 'medium', 'hard'];
      const index = options.indexOf(this.settings.difficulty);
      this.settings.difficulty = options[(index + 1) % options.length];
      savePixelPuckSettings(this.settings);
      difficulty.setText(`Difficulty: ${this.settings.difficulty}`);
    });
    difficulty.setText(`Difficulty: ${this.settings.difficulty}`);

    const rink = this.makeOptionRow(640, 320, 'Arena', () => {
      const index = this.rinks.findIndex((item) => item.id === this.settings.rinkId);
      const next = (index + 1) % this.rinks.length;
      this.settings.rinkId = this.rinks[next].id;
      savePixelPuckSettings(this.settings);
      rink.setText(`Arena: ${this.rinks[next].name}`);
    });
    const currentRink = this.rinks.find((item) => item.id === this.settings.rinkId) ?? this.rinks[0];
    rink.setText(`Arena: ${currentRink?.name ?? 'Classic'}`);

    const assist = this.makeOptionRow(640, 360, 'Assist', () => {
      this.settings.assist = !this.settings.assist;
      savePixelPuckSettings(this.settings);
      assist.setText(`Assist: ${this.settings.assist ? 'on' : 'off'}`);
    });
    assist.setText(`Assist: ${this.settings.assist ? 'on' : 'off'}`);

    const sensitivity = this.makeOptionRow(640, 400, 'Sensitivity', () => {
      const options: PixelPuckSettings['sensitivity'][] = ['low', 'medium', 'high'];
      const index = options.indexOf(this.settings.sensitivity);
      this.settings.sensitivity = options[(index + 1) % options.length];
      savePixelPuckSettings(this.settings);
      sensitivity.setText(`Sensitivity: ${this.settings.sensitivity}`);
    });
    sensitivity.setText(`Sensitivity: ${this.settings.sensitivity}`);

    const smash = this.makeOptionRow(640, 440, 'Power Smash', () => {
      this.settings.powerSmash = !this.settings.powerSmash;
      savePixelPuckSettings(this.settings);
      smash.setText(`Power Smash: ${this.settings.powerSmash ? 'on' : 'off'}`);
    });
    smash.setText(`Power Smash: ${this.settings.powerSmash ? 'on' : 'off'}`);

    const start = this.add
      .text(640, 494, 'Ready', { color: '#061b14', backgroundColor: '#36d39f', fontSize: '28px' })
      .setOrigin(0.5)
      .setPadding(18, 10, 18, 10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.startMatch();
      });

    const hint = this.add.text(640, 540, 'Drag within your half to move. Score 7 to win.', { color: '#9db6d4', fontSize: '16px' }).setOrigin(0.5);

    this.menuContainer = this.add.container(0, 0, [panel, title, subtitle, mode, difficulty, rink, assist, sensitivity, smash, start, hint]).setDepth(20);
  }

  private createPauseUi() {
    const panel = this.add.rectangle(640, 360, 560, 700, 0x0c1826, 0.95).setStrokeStyle(2, 0x2b4159, 1);
    const title = this.add.text(640, 140, 'Paused', { color: '#ffffff', fontSize: '36px' }).setOrigin(0.5);

    const sound = this.makeOptionRow(640, 210, 'Sound', () => {
      this.settings.soundOn = !this.settings.soundOn;
      savePixelPuckSettings(this.settings);
      sound.setText(`Sound: ${this.settings.soundOn ? 'on' : 'off'}`);
    });
    sound.setText(`Sound: ${this.settings.soundOn ? 'on' : 'off'}`);

    const haptics = this.makeOptionRow(640, 250, 'Vibration', () => {
      this.settings.haptics = !this.settings.haptics;
      savePixelPuckSettings(this.settings);
      haptics.setText(`Vibration: ${this.settings.haptics ? 'on' : 'off'}`);
    });
    haptics.setText(`Vibration: ${this.settings.haptics ? 'on' : 'off'}`);

    const quality = this.makeOptionRow(640, 290, 'Graphics', () => {
      const options: PixelPuckSettings['effects'][] = ['high', 'low', 'off'];
      const index = options.indexOf(this.settings.effects);
      this.settings.effects = options[(index + 1) % options.length];
      savePixelPuckSettings(this.settings);
      this.qualityTuner?.updateFromSettings(this.settings);
      quality.setText(`Graphics: ${this.settings.effects}`);
    });
    quality.setText(`Graphics: ${this.settings.effects}`);

    const screenShake = this.makeOptionRow(640, 330, 'Screen Shake', () => {
      this.settings.screenShake = !this.settings.screenShake;
      savePixelPuckSettings(this.settings);
      screenShake.setText(`Screen Shake: ${this.settings.screenShake ? 'on' : 'off'}`);
    });
    screenShake.setText(`Screen Shake: ${this.settings.screenShake ? 'on' : 'off'}`);

    const trail = this.makeOptionRow(640, 370, 'Puck Trail', () => {
      this.settings.trail = !this.settings.trail;
      savePixelPuckSettings(this.settings);
      trail.setText(`Puck Trail: ${this.settings.trail ? 'on' : 'off'}`);
    });
    trail.setText(`Puck Trail: ${this.settings.trail ? 'on' : 'off'}`);

    const autoQuality = this.makeOptionRow(640, 410, 'Auto Quality', () => {
      this.settings.autoQuality = !this.settings.autoQuality;
      savePixelPuckSettings(this.settings);
      this.qualityTuner?.updateFromSettings(this.settings);
      autoQuality.setText(`Auto Quality: ${this.settings.autoQuality ? 'on' : 'off'}`);
    });
    autoQuality.setText(`Auto Quality: ${this.settings.autoQuality ? 'on' : 'off'}`);

    const dprCap = this.makeOptionRow(640, 450, 'DPR Cap', () => {
      const options = [1.25, 1.5, 1.75, 2, 2.25];
      const idx = options.findIndex((value) => Math.abs(value - this.settings.dprCap) < 0.01);
      const next = options[(idx + 1) % options.length];
      this.settings.dprCap = next;
      savePixelPuckSettings(this.settings);
      this.qualityTuner?.updateFromSettings(this.settings);
      dprCap.setText(`DPR Cap: ${next.toFixed(2)}`);
    });
    dprCap.setText(`DPR Cap: ${this.settings.dprCap.toFixed(2)}`);

    const spin = this.makeOptionRow(640, 490, 'Spin', () => {
      this.settings.spin = !this.settings.spin;
      savePixelPuckSettings(this.settings);
      this.applyPhysicsSettings();
      spin.setText(`Spin: ${this.settings.spin ? 'on' : 'off'}`);
    });
    spin.setText(`Spin: ${this.settings.spin ? 'on' : 'off'}`);

    const oneHanded = this.makeOptionRow(640, 530, 'One-Handed', () => {
      this.settings.oneHanded = !this.settings.oneHanded;
      savePixelPuckSettings(this.settings);
      oneHanded.setText(`One-Handed: ${this.settings.oneHanded ? 'on' : 'off'}`);
      this.applyHudInsets();
    });
    oneHanded.setText(`One-Handed: ${this.settings.oneHanded ? 'on' : 'off'}`);

    const oneHandedSide = this.makeOptionRow(640, 570, 'Handed Side', () => {
      this.settings.oneHandedSide = this.settings.oneHandedSide === 'left' ? 'right' : 'left';
      savePixelPuckSettings(this.settings);
      oneHandedSide.setText(`Handed Side: ${this.settings.oneHandedSide}`);
      this.applyHudInsets();
    });
    oneHandedSide.setText(`Handed Side: ${this.settings.oneHandedSide}`);

    const resume = this.add
      .text(640, 640, 'Resume', { color: '#0b1d14', backgroundColor: '#36d39f', fontSize: '26px' })
      .setOrigin(0.5)
      .setPadding(16, 8, 16, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.togglePause(false);
      });

    const exit = this.add
      .text(640, 684, 'Exit to Lobby', { color: '#f6f6ff', backgroundColor: '#2a3344', fontSize: '18px' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.hooks.backToLobby();
      });

    this.pauseContainer = this.add.container(0, 0, [panel, title, sound, haptics, quality, screenShake, trail, autoQuality, dprCap, spin, oneHanded, oneHandedSide, resume, exit]).setDepth(21);
  }

  private createEndUi() {
    const panel = this.add.rectangle(640, 360, 520, 320, 0x101823, 0.94).setStrokeStyle(2, 0x3e5d83, 1);
    const title = this.add.text(640, 286, 'Match Over', { color: '#ffffff', fontSize: '36px' }).setOrigin(0.5);
    const summary = this.add.text(640, 342, '', { color: '#d8e8ff', fontSize: '28px', align: 'center' }).setOrigin(0.5);

    const rematch = this.add
      .text(640, 404, 'Rematch', { color: '#051c12', backgroundColor: '#34d49f', fontSize: '26px' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.endContainer.setVisible(false);
        this.startMatch();
      });

    const change = this.add
      .text(640, 446, 'Change Settings', { color: '#f6f6ff', backgroundColor: '#293f64', fontSize: '20px' })
      .setOrigin(0.5)
      .setPadding(8, 6, 8, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.endContainer.setVisible(false);
        this.menuContainer.setVisible(true);
      });

    const lobby = this.add
      .text(640, 482, 'Back to Lobby', { color: '#f6f6ff', backgroundColor: '#3a304e', fontSize: '20px' })
      .setOrigin(0.5)
      .setPadding(8, 6, 8, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        this.hooks.backToLobby();
      });

    this.endContainer = this.add.container(0, 0, [panel, title, summary, rematch, change, lobby]).setDepth(20);
  }

  private createTutorialUi() {
    const panel = this.add.rectangle(640, 560, 720, 140, 0x0d1724, 0.9).setStrokeStyle(1, 0x37506f, 1);
    const title = this.add.text(640, 520, 'Quick Tips', { color: '#ffffff', fontSize: '22px' }).setOrigin(0.5);
    const body = this.add.text(640, 560, 'Drag within your half to move. Smash by swiping fast.\nKeep shots low for tight angles.', {
      color: '#c5d8ff',
      fontSize: '18px',
      align: 'center'
    }).setOrigin(0.5);

    this.tutorialContainer = this.add.container(0, 0, [panel, title, body]).setDepth(18);
  }

  private makeOptionRow(x: number, y: number, text: string, onClick: () => void) {
    return this.add
      .text(x, y, text, { color: '#f2f6ff', backgroundColor: '#1f3047', fontSize: '20px' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playUiTap();
        onClick();
      });
  }

  private startMatch() {
    this.menuContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.pauseContainer.setVisible(false);
    this.pausedByGame = false;
    this.rink = getRinkById(this.settings.rinkId);
    this.drawRink();
    this.updatePlayerBounds();

    this.match = createInitialMatchState(this.settings.mode);
    this.matchStartMs = performance.now();
    this.aiState = createAiState(this.rink);
    this.resetRound(false);

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      rink: this.settings.rinkId
    });

    this.notify('Match live. First to 7 wins.');
  }

  private drawRink() {
    const bounds = this.rink.bounds;
    this.boardGfx.clear();
    this.boardGlow.clear();

    this.boardGfx.fillStyle(0x061421, 1);
    this.boardGfx.fillRect(0, 0, 1280, 720);

    this.boardGfx.fillGradientStyle(0x0c263b, 0x0d2338, 0x0f2d46, 0x0b2134, 1);
    this.boardGfx.fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 48);

    this.boardGfx.lineStyle(22, 0x1e364b, 1);
    this.boardGfx.strokeRoundedRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12, 56);

    this.boardGfx.lineStyle(4, 0x9fc9ff, 0.9);
    this.boardGfx.strokeRoundedRect(bounds.x + 8, bounds.y + 8, bounds.width - 16, bounds.height - 16, 40);

    this.boardGfx.lineStyle(2, 0x5f8fc1, 0.7);
    this.boardGfx.lineBetween(bounds.x + 40, bounds.y + bounds.height / 2, bounds.x + bounds.width - 40, bounds.y + bounds.height / 2);

    this.boardGfx.fillStyle(0x6de5ff, 0.22);
    this.boardGfx.fillRoundedRect(this.rink.goals.top.x, this.rink.goals.top.lineY - 14, this.rink.goals.top.width, 22, 10);
    this.boardGfx.fillRoundedRect(this.rink.goals.bottom.x, this.rink.goals.bottom.lineY - 8, this.rink.goals.bottom.width, 22, 10);

    this.boardGlow.lineStyle(12, 0x274e6f, 0.8);
    this.boardGlow.strokeRoundedRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, 52);

    this.boardGlow.lineStyle(2, 0xa9d8ff, 0.35);
    this.boardGlow.beginPath();
    this.boardGlow.moveTo(bounds.x + 120, bounds.y + 36);
    this.boardGlow.lineTo(bounds.x + bounds.width - 120, bounds.y + 16);
    this.boardGlow.strokePath();

    this.boardGlow.fillStyle(0xffffff, 0.05);
    this.boardGlow.fillTriangle(bounds.x + 60, bounds.y + 20, bounds.x + 260, bounds.y + 20, bounds.x + 200, bounds.y + 120);

    this.boardGlow.fillStyle(0xffffff, 0.04);
    this.boardGlow.fillTriangle(bounds.x + bounds.width - 260, bounds.y + bounds.height - 40, bounds.x + bounds.width - 40, bounds.y + bounds.height - 20, bounds.x + bounds.width - 80, bounds.y + bounds.height - 140);

    this.boardGfx.fillStyle(0x709cc4, 0.7);
    for (let i = 0; i < this.rink.obstacles.length; i += 1) {
      const obstacle = this.rink.obstacles[i];
      if (obstacle.kind === 'circle') {
        this.boardGfx.fillCircle(obstacle.x, obstacle.y, obstacle.radius);
      } else {
        this.boardGfx.fillRoundedRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
      }
    }
  }

  private togglePause(open: boolean) {
    this.pauseContainer.setVisible(open);
  }

  private applyHudInsets() {
    const safe = this.readSafeAreaInsets();
    const size = computeContainSize(window.innerWidth, window.innerHeight);
    const scale = size.scale || 1;
    this.hudInset = {
      top: safe.top / scale,
      left: safe.left / scale,
      right: safe.right / scale,
      bottom: safe.bottom / scale
    };

    const top = 12 + this.hudInset.top;
    const sideLeft = 20 + this.hudInset.left;
    const sideRight = 20 + this.hudInset.right;
    const pauseX = this.settings.oneHanded && this.settings.oneHandedSide === 'left' ? sideLeft : 1200 - sideRight;

    this.scoreText.setPosition(640, top);
    this.timerText.setPosition(640, top + 44);
    this.cooldownBg.setPosition(sideLeft, top + 26);
    this.cooldownBar.setPosition(sideLeft, top + 26);
    this.cooldownLabel.setPosition(sideLeft, top + 6);
    this.statusText.setPosition(sideLeft, top + 68);
    this.pauseButton.setPosition(pauseX, top + 4);
    this.perfText.setPosition(sideLeft, top + 98);
    this.notificationText.setPosition(640, 680 - this.hudInset.bottom);
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

  private nextRand() {
    this.rngSeed = (this.rngSeed * 16807) % 1;
    return this.rngSeed;
  }

  private applyPhysicsSettings() {
    this.physicsSettings.spinFactor = this.settings.spin ? DEFAULT_PHYSICS.spinFactor : 0;
  }

  private playPuckHit(smash: boolean, strength: number) {
    if (!this.settings.soundOn) return;
    const now = performance.now();
    const key = smash ? 'puck-smash' : 'puck-hit';
    const last = this.hitLimiter.get(key) ?? 0;
    if (now - last < 40) return;
    this.hitLimiter.set(key, now);
    const bases = smash ? [360, 390, 420] : [240, 270, 300];
    const base = bases[Math.floor(this.nextRand() * bases.length)];
    const variance = 0.92 + this.nextRand() * 0.14;
    playTone({
      frequency: base * variance,
      durationMs: 40,
      gain: 0.02 + strength * 0.03,
      category: 'sfx',
      gameId: this.hooks.gameId
    });
  }

  private playWallHit(strength: number) {
    if (!this.settings.soundOn) return;
    const now = performance.now();
    const key = 'wall-hit';
    const last = this.hitLimiter.get(key) ?? 0;
    if (now - last < 50) return;
    this.hitLimiter.set(key, now);
    playTone({
      frequency: 280 + strength * 80,
      durationMs: 26,
      gain: 0.012 + strength * 0.02,
      category: 'sfx',
      gameId: this.hooks.gameId
    });
  }

  private playGoal() {
    if (!this.settings.soundOn) return;
    playTone({ frequency: 520, durationMs: 140, gain: 0.05, category: 'sfx', gameId: this.hooks.gameId });
    playTone({ frequency: 640, durationMs: 120, gain: 0.04, category: 'sfx', gameId: this.hooks.gameId });
  }

  private playUiTap() {
    if (!this.settings.soundOn) return;
    playTone({ frequency: 420, durationMs: 30, gain: 0.015, category: 'sfx', gameId: this.hooks.gameId });
  }

  private playCountdownTick() {
    if (!this.settings.soundOn) return;
    playTone({ frequency: 520, durationMs: 45, gain: 0.03, category: 'sfx', gameId: this.hooks.gameId });
  }

  private playWin() {
    if (!this.settings.soundOn) return;
    playTone({ frequency: 660, durationMs: 180, gain: 0.05, category: 'sfx', gameId: this.hooks.gameId });
  }

  private triggerHaptic(pattern: number | number[]) {
    if (!this.settings.haptics || prefersReducedMotion()) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // no-op
      }
    }
  }

  private shakeCamera(duration: number, intensity: number) {
    if (prefersReducedMotion()) return;
    this.cameras.main.shake(duration, intensity);
  }

  private flashCamera(duration: number, red: number, green: number, blue: number) {
    if (prefersReducedMotion()) return;
    this.cameras.main.flash(duration, red, green, blue, false);
  }

  private notify(message: string) {
    this.notificationText.setText(message);
    this.notificationText.setVisible(true);
    this.tweens.add({
      targets: this.notificationText,
      alpha: { from: 1, to: 0 },
      duration: 1600,
      onComplete: () => {
        this.notificationText.setVisible(false);
        this.notificationText.setAlpha(1);
      }
    });
  }

  private handleWindowBlur = () => {
    setPointerUp(this.pointerState, this.pointerState.pointerId);
  };
}
