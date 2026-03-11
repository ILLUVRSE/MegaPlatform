import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { triggerHaptic } from '../../systems/gameplayComfort';
import { evaluateChallenge, getDailyChallenge, loadGoalieChallenges, utcDayKey } from './challenges';
import {
  calculateSeasonRatingDelta,
  evaluateCareerObjective,
  generateCareerSeason,
  loadCareerCatalog,
  utcWeekKey,
  type CareerCatalog,
  type CareerSeasonSchedule
} from './career';
import { loadAchievementCatalog, evaluateAchievements, type AchievementCatalog } from './achievements';
import { loadCosmeticsCatalog, buyCosmetic, cosmeticPreviewColor, equipCosmetic, type CosmeticCatalog } from './cosmetics';
import { calculateRewards, xpToNextLevel } from './currency';
import { createDragController, createTapDiveController, zoneFromPointer, zoneToGoaliePosition } from './input';
import { buildShotSchedule, loadShotPatterns, type ShotSchedule } from './patterns';
import { loadGoalieSettings, loadGoalieStats, saveGoalieSettings, saveGoalieStats, toChallengeProgress, updateStatsAfterMatch } from './persistence';
import {
  applyRewardsToProgression,
  ensureSeason,
  loadGoalieProgression,
  recordCareerMatchResult,
  saveGoalieProgression,
  type GoalieProgressionProfile
} from './progression';
import { loadLastReplay, ReplayRecorder, saveLastReplay, simulateReplayOutcome, type GoalieReplay } from './replay';
import { buildRankedSchedule, resolveRankTier } from './ranked';
import { applyShotResolution, createMatchState, evaluateMatchEnd, finalizeMatch, resolveSaveGrade, tickMatch } from './rules';
import { GoalieVfxPool } from './vfxPool';
import type {
  ChallengeCatalog,
  ChallengeDefinition,
  GoalieInputState,
  GoalieSetup,
  GoalieStoredSettings,
  GoalieZone,
  MatchState,
  SaveActionType,
  ScheduledShot,
  ShotPatternCatalog
} from './types';

interface GoalieSceneConfig {
  hooks: GameRuntimeHooks;
}

type RoundState = 'menu' | 'running' | 'paused' | 'ended' | 'howto';
type AudioCue = 'telegraph' | 'save' | 'perfect' | 'late' | 'goal' | 'crowd' | 'ui';

interface RuntimeShot {
  active: boolean;
  resolved: boolean;
  shotIndex: number;
  shot: ScheduledShot | null;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
}

const SHOT_POOL_SIZE = 24;
const DIVE_COOLDOWN_MS = 4_200;
const DIVE_MISS_RECOVERY_MS = 560;
const HOLD_SNAG_MS = 230;
const POKE_TAP_MS = 165;

function modeLabel(mode: GoalieStoredSettings['mode']): string {
  if (mode === 'survival') return 'Classic Gauntlet';
  if (mode === 'time_attack') return 'Timed 60s';
  if (mode === 'career') return `Career Season (${utcWeekKey()})`;
  if (mode === 'ranked') return `Ranked Daily (${utcDayKey()})`;
  return 'Challenge Ladder';
}

function difficultyLabel(difficulty: GoalieStoredSettings['difficulty']): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function controlsLabel(controls: GoalieStoredSettings['controls']): string {
  return controls === 'drag' ? 'Swipe/Drag' : 'Tap-to-Dive';
}

function zoneToPoint(zone: GoalieZone): { x: number; y: number } {
  const left = zone.endsWith('left');
  const high = zone.startsWith('high');
  const low = zone.startsWith('low');
  return {
    x: left ? 470 : 810,
    y: high ? 245 : low ? 510 : 390
  };
}

function emitHaptic(enabled: boolean, pattern: number | number[]) {
  if (!enabled) return;
  triggerHaptic(pattern);
}

function neighborZoneBySwipe(from: GoalieZone, to: GoalieZone): readonly GoalieZone[] {
  if (from === to) return [from];
  if (from.split('-')[0] === to.split('-')[0]) return [from, to];
  return [from, to];
}

function modeNetFlash(mode: GoalieSetup['mode']): number {
  if (mode === 'ranked') return 0xc95dff;
  if (mode === 'challenge') return 0xff8d4d;
  if (mode === 'time_attack') return 0xff5967;
  return 0xff4250;
}

export class GoalieGauntletScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private fatal = false;
  private roundState: RoundState = 'menu';

  private settings: GoalieStoredSettings = loadGoalieSettings();
  private stats = loadGoalieStats();
  private progression: GoalieProgressionProfile = loadGoalieProgression();

  private challengeCatalog!: ChallengeCatalog;
  private careerCatalog!: CareerCatalog;
  private cosmeticCatalog!: CosmeticCatalog;
  private achievementCatalog!: AchievementCatalog;
  private patternCatalog!: ShotPatternCatalog;
  private careerSeason: CareerSeasonSchedule | null = null;
  private careerStoreCursor = 0;
  private challengeIndex = 0;
  private useDailyChallenge = false;
  private currentSeed = 1;
  private rankedDayKey = utcDayKey();

  private setup!: GoalieSetup;
  private match!: MatchState;
  private replayRecorder: ReplayRecorder | null = null;
  private replayPayload: GoalieReplay | null = null;
  private replayCursor = 0;
  private replayMode = false;

  private readonly drag = createDragController();
  private readonly tapDive = createTapDiveController();

  private goalieX = 640;
  private goalieY = 565;
  private goalieZone: GoalieZone = 'mid-left';
  private goalieInput: GoalieInputState = { zone: 'mid-left', changedAtMs: 0, gestureType: 'drag', actionType: 'standard' };
  private pointerDown: { id: number; x: number; y: number; atMs: number; zone: GoalieZone } | null = null;
  private holdArmed = false;
  private diveCooldownUntilMs = 0;
  private recoveryUntilMs = 0;

  private readonly shotPool: RuntimeShot[] = [];
  private schedule: ShotSchedule | null = null;
  private nextTelegraphIndex = 0;
  private nextSpawnIndex = 0;
  private resolvedShots = 0;

  private perfectStreak = 0;
  private bestPerfectStreak = 0;
  private netFlashMs = 0;
  private cameraPulseActive = false;

  private rinkGfx!: Phaser.GameObjects.Graphics;
  private shotsGfx!: Phaser.GameObjects.Graphics;
  private vfxGfx!: Phaser.GameObjects.Graphics;

  private goalieBody!: Phaser.GameObjects.Rectangle;
  private goalieMask!: Phaser.GameObjects.Arc;
  private goalieGlove!: Phaser.GameObjects.Rectangle;
  private goalieStick!: Phaser.GameObjects.Rectangle;
  private iceTrailColor = 0xdcf7ff;

  private hudTop!: Phaser.GameObjects.Text;
  private hudSub!: Phaser.GameObjects.Text;
  private hudFeedback!: Phaser.GameObjects.Text;
  private hudIncoming!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;

  private menuContainer!: Phaser.GameObjects.Container;
  private menuRows: Phaser.GameObjects.Text[] = [];

  private howToContainer!: Phaser.GameObjects.Container;

  private endContainer!: Phaser.GameObjects.Container;
  private endSummary!: Phaser.GameObjects.Text;

  private readonly vfxPool = new GoalieVfxPool();

  constructor(config: GoalieSceneConfig) {
    super('goalie-gauntlet-main');
    this.hooks = config.hooks;
  }

  create() {
    try {
      this.patternCatalog = loadShotPatterns();
      this.challengeCatalog = loadGoalieChallenges();
      this.careerCatalog = loadCareerCatalog();
      this.cosmeticCatalog = loadCosmeticsCatalog();
      this.achievementCatalog = loadAchievementCatalog();
      this.progression = ensureSeason(this.progression, utcWeekKey());
      this.match = createMatchState({
        mode: this.settings.mode,
        difficulty: this.settings.difficulty,
        controls: this.settings.controls,
        sensitivity: this.settings.sensitivity,
        options: {
          assistLaneIndicator: this.settings.assistLaneIndicator,
          warmup: this.settings.warmup,
          haptics: this.settings.haptics,
          reducedMotion: this.settings.reducedMotion,
          lowQuality: this.settings.lowQuality,
          preLaneIndicator: this.settings.preLaneIndicator
        }
      });

      const canvas = this.game.canvas as HTMLCanvasElement;
      canvas.style.touchAction = 'none';
      this.input.setTopOnly(true);

      this.buildPool();
      this.createRink();
      this.createGoalie();
      this.applyCosmeticLoadoutVisuals();
      this.createHud();
      this.createMenu();
      this.createHowTo();
      this.createEndOverlay();
      this.bindInput();

      this.showMenu();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Goalie Gauntlet boot failure';
      this.fatal = true;
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
      this.add
        .text(640, 360, `Goalie Gauntlet failed\n${message}`, {
          color: '#ffe9e9',
          fontSize: '28px',
          align: 'center',
          backgroundColor: '#401313'
        })
        .setOrigin(0.5)
        .setDepth(100);
    }
  }

  update(_time: number, deltaMs: number) {
    if (this.fatal) return;

    const dtMs = Math.min(50, Math.max(0, deltaMs));
    const dtSec = dtMs / 1000;

    if (this.roundState === 'running') {
      this.match = tickMatch(this.match, dtMs);
      if (this.replayMode) this.stepReplayInputs();
      this.stepHoldActivation();
      this.updateGoalie(dtSec);
      this.stepTimeline();
      this.stepActiveShots();
      this.vfxPool.update(dtMs);
      this.netFlashMs = Math.max(0, this.netFlashMs - dtMs);

      const end = evaluateMatchEnd(this.match);
      if (end.ended) {
        this.finishMatch(end.reason ?? 'time');
      } else if (this.setup.mode === 'challenge') {
        this.evaluateChallengeEnd();
      } else if (this.setup.mode === 'career' && this.schedule && this.resolvedShots >= this.schedule.shots.length) {
        this.finishMatch('challenge');
      } else if (this.setup.mode === 'ranked' && this.schedule && this.resolvedShots >= this.schedule.shots.length) {
        this.finishMatch('challenge');
      }

      this.renderShots();
      this.updateHud();
      return;
    }

    this.vfxPool.update(dtMs);
    this.renderShots();
  }

  private buildPool() {
    for (let i = 0; i < SHOT_POOL_SIZE; i += 1) {
      this.shotPool.push({
        active: false,
        resolved: false,
        shotIndex: -1,
        shot: null,
        startX: 0,
        startY: 0,
        targetX: 0,
        targetY: 0,
        x: 0,
        y: 0
      });
    }
  }

  private createRink() {
    this.rinkGfx = this.add.graphics();
    this.shotsGfx = this.add.graphics();
    this.vfxGfx = this.add.graphics();
  }

  private createGoalie() {
    this.goalieBody = this.add.rectangle(this.goalieX, this.goalieY, 174, 108, 0xecf5ff).setStrokeStyle(3, 0x235177);
    const maskColor = Number.parseInt(this.stats.selectedMaskColor.replace('#', '0x'), 16);
    this.goalieMask = this.add.circle(this.goalieX, this.goalieY - 60, 26, Number.isFinite(maskColor) ? maskColor : 0xf2f7ff).setStrokeStyle(2, 0x2a4a69);
    this.goalieGlove = this.add.rectangle(this.goalieX - 92, this.goalieY + 6, 42, 52, 0x95dbff).setStrokeStyle(2, 0x1d4462);
    this.goalieStick = this.add.rectangle(this.goalieX + 92, this.goalieY + 16, 24, 72, 0xc4d4de).setStrokeStyle(2, 0x32495d);
  }

  private createHud() {
    this.add.text(20, 16, 'Goalie Gauntlet', { color: '#f4fbff', fontSize: '28px' }).setDepth(20);
    this.hudTop = this.add.text(20, 50, '', { color: '#f4fbff', fontSize: '20px' }).setDepth(20);
    this.hudSub = this.add.text(20, 78, '', { color: '#b5dfff', fontSize: '18px' }).setDepth(20);
    this.hudIncoming = this.add.text(640, 24, '', { color: '#ffe69e', fontSize: '20px' }).setOrigin(0.5, 0).setDepth(20);
    this.hudFeedback = this.add.text(640, 72, '', { color: '#fff7d6', fontSize: '34px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(21);

    this.pauseButton = this.add
      .text(1188, 18, 'Pause', { color: '#0e2435', backgroundColor: '#ffd566', fontSize: '20px' })
      .setPadding(12, 6, 12, 6)
      .setDepth(21)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.roundState === 'running') this.roundState = 'paused';
        else if (this.roundState === 'paused') this.roundState = 'running';
        this.pauseButton.setText(this.roundState === 'paused' ? 'Resume' : 'Pause');
      });
  }

  private createMenu() {
    const panel = this.add.rectangle(640, 360, 760, 610, 0x091829, 0.95).setStrokeStyle(3, 0x2f638a);
    const title = this.add.text(640, 122, 'Goalie Gauntlet', { color: '#f4fbff', fontSize: '42px' }).setOrigin(0.5);
    const subtitle = this.add
      .text(640, 165, 'Fast reflex saves. Shared stream in Party Room.', { color: '#abd8fa', fontSize: '18px' })
      .setOrigin(0.5);

    const labels = this.menuLabels();
    const children: Phaser.GameObjects.GameObject[] = [panel, title, subtitle];
    this.menuRows = [];

    for (let i = 0; i < labels.length; i += 1) {
      const row = this.add
        .text(640, 220 + i * 39, labels[i], {
          color: i >= labels.length - 2 ? '#0e2435' : '#f3fbff',
          backgroundColor: i >= labels.length - 2 ? '#ffd566' : '#1a3c57',
          fontSize: '21px'
        })
        .setOrigin(0.5)
        .setPadding(12, 6, 12, 6)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.onMenuRow(i));

      children.push(row);
      this.menuRows.push(row);
    }

    this.menuContainer = this.add.container(0, 0, children).setDepth(60);
  }

  private createHowTo() {
    const panel = this.add.rectangle(640, 360, 780, 520, 0x0a1726, 0.97).setStrokeStyle(3, 0x39759d);
    const title = this.add.text(640, 138, 'How To Play', { color: '#f4fbff', fontSize: '36px' }).setOrigin(0.5);
    const body = this.add
      .text(
        640,
        200,
        [
          'Swipe/drag to set 6 save zones, or enable tap-to-dive.',
          'Read telegraphs: wind-up, glow, and lane indicator assist.',
          'Grading: PERFECT (early-tight), GOOD, LATE (save but streak break), MISS.',
          'Advanced: low poke check tap, high glove snag hold, swipe desperation dive (5s cooldown).',
          'Rebounds and fake shifts require a second save and late telegraph correction.',
          'Classic: 3 lives. Timed 60s: highest score. Challenge: JSON ladder.',
          'Ranked: 10-round UTC daily seed. Replay: re-run the last round deterministically.',
          'Party Room: host-authoritative shared shot stream and score sync.'
        ].join('\n'),
        { color: '#d0e7f8', fontSize: '19px', align: 'center', lineSpacing: 6 }
      )
      .setOrigin(0.5, 0);

    const close = this.add
      .text(640, 566, 'Close', { color: '#0e2435', backgroundColor: '#ffd566', fontSize: '22px' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.roundState = 'menu';
        this.howToContainer.setVisible(false);
        this.menuContainer.setVisible(true);
      });

    this.howToContainer = this.add.container(0, 0, [panel, title, body, close]).setDepth(75).setVisible(false);
  }

  private createEndOverlay() {
    const panel = this.add.rectangle(640, 360, 620, 500, 0x0a1726, 0.95).setStrokeStyle(3, 0x2f648d);
    this.endSummary = this.add.text(640, 196, '', { color: '#f4fbff', fontSize: '23px', align: 'center' }).setOrigin(0.5, 0);

    const rematch = this.add
      .text(640, 516, 'Rematch', { color: '#0e2435', backgroundColor: '#ffd566', fontSize: '24px' })
      .setPadding(12, 6, 12, 6)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startMatch());

    const replayLast = this.add
      .text(640, 562, 'Replay Last Round', { color: '#d8efff', backgroundColor: '#194a6a', fontSize: '20px' })
      .setPadding(10, 6, 10, 6)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startReplayFromStorage());

    const settings = this.add
      .text(640, 604, 'Settings', { color: '#f0f8ff', backgroundColor: '#1d4866', fontSize: '21px' })
      .setPadding(12, 6, 12, 6)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showMenu());

    const quit = this.add
      .text(640, 648, 'Quit to Lobby', { color: '#dbefff', backgroundColor: '#2b4054', fontSize: '20px' })
      .setPadding(10, 6, 10, 6)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.endContainer = this.add.container(0, 0, [panel, this.endSummary, rematch, replayLast, settings, quit]).setDepth(70).setVisible(false);
  }

  private bindInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault();
      if (this.roundState !== 'running' || this.replayMode) return;

      const zone = zoneFromPointer(pointer.x, pointer.y, 1280, 720);
      this.pointerDown = {
        id: pointer.id,
        x: pointer.x,
        y: pointer.y,
        atMs: this.match.elapsedMs,
        zone
      };
      this.holdArmed = true;

      if (this.settings.controls === 'drag') {
        this.drag.pointerDown(pointer.id, pointer.x, pointer.y);
        this.applyGoalieZone(zone, 'drag', 'standard');
      } else {
        this.applyGoalieZone(this.tapDive.zoneAt(pointer.x, pointer.y, 1280, 720), 'tap_dive', 'standard');
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault();
      if (this.roundState !== 'running' || this.settings.controls !== 'drag' || this.replayMode) return;
      this.drag.pointerMove(pointer.id, pointer.x, pointer.y);
      this.applyGoalieZone(zoneFromPointer(pointer.x, pointer.y, 1280, 720), 'drag', 'standard');
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault();
      this.drag.pointerUp(pointer.id);
      if (this.roundState !== 'running' || this.replayMode) return;
      this.resolveGesture(pointer);
      this.pointerDown = null;
      this.holdArmed = false;
    });
  }

  private resolveGesture(pointer: Phaser.Input.Pointer) {
    if (!this.pointerDown) return;
    const elapsed = this.match.elapsedMs - this.pointerDown.atMs;
    const upZone = zoneFromPointer(pointer.x, pointer.y, 1280, 720);
    const dx = pointer.x - this.pointerDown.x;
    const swipeAcross = Math.abs(dx) >= 1280 * 0.72;

    if (swipeAcross && elapsed <= 560 && this.match.elapsedMs >= this.diveCooldownUntilMs) {
      const coveredZones = neighborZoneBySwipe(this.pointerDown.zone, upZone);
      this.applyActionInput(upZone, 'tap_dive', 'desperation_dive', coveredZones);
      this.diveCooldownUntilMs = this.match.elapsedMs + DIVE_COOLDOWN_MS;
      return;
    }

    if (elapsed <= POKE_TAP_MS && upZone.startsWith('low')) {
      this.applyActionInput(upZone, 'tap_dive', 'poke_check');
      return;
    }

    if (elapsed >= HOLD_SNAG_MS && upZone.startsWith('high')) {
      this.applyActionInput(upZone, 'drag', 'glove_snag', undefined, elapsed);
      return;
    }

    this.applyGoalieZone(upZone, this.settings.controls, 'standard');
  }

  private stepHoldActivation() {
    if (!this.pointerDown || !this.holdArmed || this.replayMode) return;
    const heldMs = this.match.elapsedMs - this.pointerDown.atMs;
    if (heldMs < HOLD_SNAG_MS || !this.goalieZone.startsWith('high')) return;
    this.applyActionInput(this.goalieZone, 'drag', 'glove_snag', undefined, heldMs);
    this.holdArmed = false;
  }

  private stepReplayInputs() {
    if (!this.replayPayload) return;
    while (this.replayCursor < this.replayPayload.inputEvents.length) {
      const event = this.replayPayload.inputEvents[this.replayCursor];
      if (event.atMs > this.match.elapsedMs) break;
      this.goalieZone = event.zone;
      this.goalieInput = {
        zone: event.zone,
        changedAtMs: event.changedAtMs,
        gestureType: event.gestureType,
        actionType: event.actionType ?? 'standard',
        coveredZones: event.coveredZones,
        holdDurationMs: event.holdDurationMs
      };
      const target = zoneToGoaliePosition(event.zone);
      this.goalieX = target.x;
      this.goalieY = target.y;
      this.replayCursor += 1;
    }
  }

  private menuLabels(): string[] {
    const challenge = this.challengeCatalog.challenges[this.challengeIndex] as ChallengeDefinition;
    const progress = toChallengeProgress(this.stats);
    const rankTier = resolveRankTier(this.stats.bestRankedScore);
    const seasonKey = utcWeekKey();
    const season = generateCareerSeason(this.careerCatalog, seasonKey, this.progression.profileSeed);
    const careerIndex = Math.min(this.progression.career.currentMatchIndex, season.matches.length - 1);
    const careerMatch = season.matches[careerIndex];
    const cosmetics = this.cosmeticCatalog.items;
    const storeItem = cosmetics[this.careerStoreCursor % cosmetics.length];
    const owned = this.progression.unlockedCosmetics.includes(storeItem.id);
    const challengeOrRankedOrCareer =
      this.settings.mode === 'career'
        ? `Career: ${seasonKey} M${careerIndex + 1}/12 ${careerMatch.template.name} (${careerMatch.template.opponentTier.toUpperCase()})`
        : this.settings.mode === 'ranked'
          ? `Ranked: ${utcDayKey()} | Best ${this.stats.bestRankedScore} (${rankTier})`
          : `Challenge: ${this.useDailyChallenge ? `Daily (${utcDayKey()})` : challenge.name}${progress.completed[challenge.id] ? ' ✓' : ''}`;
    const objectivePreview =
      careerMatch.template.objective.type === 'save_target'
        ? `Career Objective: Save ${careerMatch.template.objective.savesTarget}`
        : careerMatch.template.objective.type === 'goals_under'
          ? `Career Objective: Allow <= ${careerMatch.template.objective.maxGoals} goals`
          : careerMatch.template.objective.type === 'streak_target'
            ? `Career Objective: Streak ${careerMatch.template.objective.streakTarget}`
            : 'Career Objective: Sudden Death';
    const rewardPreview = calculateRewards({
      mode: 'career',
      score: 1800,
      stats: this.match?.stats ?? createMatchState({
        mode: 'career',
        difficulty: 'medium',
        controls: 'drag',
        sensitivity: 'medium',
        options: {
          assistLaneIndicator: true,
          warmup: false,
          haptics: false,
          reducedMotion: false,
          lowQuality: false,
          preLaneIndicator: true
        }
      }).stats,
      matchCompleted: true,
      careerObjectivePassed: true
    });
    const loadout = this.progression.equippedCosmetics;
    const economyPreview = `Coins ${this.progression.coins} | Lv ${this.progression.level} | XP ${xpToNextLevel(this.progression.xp).currentLevelXp}/${xpToNextLevel(this.progression.xp).nextLevelXp}`;
    const ladderPreview = `Season Ladder: ${this.progression.seasonTier} (${this.progression.seasonRating})`;
    return [
      `Mode: ${modeLabel(this.settings.mode)}`,
      `Difficulty: ${difficultyLabel(this.settings.difficulty)}`,
      `Controls: ${controlsLabel(this.settings.controls)}`,
      `Sensitivity: ${this.settings.sensitivity}`,
      `Assist lane indicator: ${this.settings.assistLaneIndicator ? 'On' : 'Off'}`,
      `Pre-lane indicator: ${this.settings.preLaneIndicator ? 'On' : 'Off'}`,
      `Haptics: ${this.settings.haptics ? 'On' : 'Off'}`,
      `Reduced motion: ${this.settings.reducedMotion ? 'On' : 'Off'}`,
      `Low quality mode: ${this.settings.lowQuality ? 'On' : 'Off'}`,
      `Warmup: ${this.settings.warmup ? 'On' : 'Off'}`,
      `${economyPreview} | ${ladderPreview}`,
      `${challengeOrRankedOrCareer}`,
      `${objectivePreview} | Est +${rewardPreview.coins}c +${rewardPreview.xp}xp`,
      `Store: ${storeItem.name} (${storeItem.type}) ${owned ? '[EQUIP]' : `${storeItem.price}c`} | Mask ${loadout.mask || '--'}`,
      'How To Play',
      'Start Match'
    ];
  }

  private onMenuRow(index: number) {
    const modeOrder: GoalieStoredSettings['mode'][] = ['survival', 'time_attack', 'challenge', 'ranked', 'career'];
    const diffOrder: GoalieStoredSettings['difficulty'][] = ['easy', 'medium', 'hard'];
    const sensOrder: GoalieStoredSettings['sensitivity'][] = ['low', 'medium', 'high'];

    if (index === 0) {
      const at = modeOrder.indexOf(this.settings.mode);
      this.settings.mode = modeOrder[(at + 1) % modeOrder.length];
    } else if (index === 1) {
      const at = diffOrder.indexOf(this.settings.difficulty);
      this.settings.difficulty = diffOrder[(at + 1) % diffOrder.length];
    } else if (index === 2) {
      this.settings.controls = this.settings.controls === 'drag' ? 'tap_dive' : 'drag';
    } else if (index === 3) {
      const at = sensOrder.indexOf(this.settings.sensitivity);
      this.settings.sensitivity = sensOrder[(at + 1) % sensOrder.length];
    } else if (index === 4) {
      this.settings.assistLaneIndicator = !this.settings.assistLaneIndicator;
    } else if (index === 5) {
      this.settings.preLaneIndicator = !this.settings.preLaneIndicator;
    } else if (index === 6) {
      this.settings.haptics = !this.settings.haptics;
    } else if (index === 7) {
      this.settings.reducedMotion = !this.settings.reducedMotion;
    } else if (index === 8) {
      this.settings.lowQuality = !this.settings.lowQuality;
    } else if (index === 9) {
      this.settings.warmup = !this.settings.warmup;
    } else if (index === 11) {
      if (this.settings.mode === 'ranked') {
        this.rankedDayKey = utcDayKey();
      } else if (this.settings.mode === 'career') {
        this.progression = ensureSeason(this.progression, utcWeekKey());
        saveGoalieProgression(this.progression);
      } else if (this.useDailyChallenge) {
        this.useDailyChallenge = false;
      } else {
        this.challengeIndex = (this.challengeIndex + 1) % this.challengeCatalog.challenges.length;
        if (this.challengeIndex === 0) this.useDailyChallenge = true;
      }
    } else if (index === 12) {
      const item = this.cosmeticCatalog.items[this.careerStoreCursor % this.cosmeticCatalog.items.length];
      const before = this.progression;
      if (!before.unlockedCosmetics.includes(item.id)) {
        this.progression = buyCosmetic(this.progression, this.cosmeticCatalog, item.id);
      } else {
        this.progression = equipCosmetic(this.progression, this.cosmeticCatalog, item.id);
      }
      this.careerStoreCursor = (this.careerStoreCursor + 1) % this.cosmeticCatalog.items.length;
      if (before !== this.progression) {
        saveGoalieProgression(this.progression);
        this.applyCosmeticLoadoutVisuals();
      }
    } else if (index === 13) {
      this.roundState = 'howto';
      this.menuContainer.setVisible(false);
      this.howToContainer.setVisible(true);
      return;
    } else if (index === 14) {
      this.startMatch();
      return;
    }

    saveGoalieSettings(this.settings);
    this.refreshMenuRows();
    this.playCue('ui');
  }

  private refreshMenuRows() {
    const labels = this.menuLabels();
    for (let i = 0; i < this.menuRows.length; i += 1) {
      this.menuRows[i].setText(labels[i]);
    }
  }

  private showMenu() {
    this.roundState = 'menu';
    this.replayMode = false;
    this.replayPayload = null;
    this.replayRecorder = null;
    this.menuContainer.setVisible(true);
    this.endContainer.setVisible(false);
    this.howToContainer.setVisible(false);
    this.clearShots();
    this.refreshMenuRows();
    this.updateHud();
  }

  private startMatch() {
    const challenge = this.useDailyChallenge
      ? getDailyChallenge(this.challengeCatalog.challenges)
      : this.challengeCatalog.challenges[this.challengeIndex];
    const seasonKey = utcWeekKey();
    this.progression = ensureSeason(this.progression, seasonKey);
    saveGoalieProgression(this.progression);
    this.careerSeason = generateCareerSeason(this.careerCatalog, seasonKey, this.progression.profileSeed);
    const careerMatch = this.careerSeason.matches[Math.min(this.progression.career.currentMatchIndex, this.careerSeason.matches.length - 1)];

    this.setup = {
      mode: this.settings.mode,
      difficulty: this.settings.mode === 'career' ? careerMatch.difficulty : this.settings.difficulty,
      controls: this.settings.controls,
      sensitivity: this.settings.sensitivity,
      options: {
        assistLaneIndicator: this.settings.assistLaneIndicator,
        warmup: this.settings.warmup,
        haptics: this.settings.haptics,
        reducedMotion: this.settings.reducedMotion,
        lowQuality: this.settings.lowQuality,
        preLaneIndicator: this.settings.preLaneIndicator
      }
    };

    let seed = Math.floor(Date.now() / 1000);
    if (this.settings.mode === 'ranked') {
      this.rankedDayKey = utcDayKey();
      seed = Number.parseInt(this.rankedDayKey.replace(/-/g, ''), 10);
    } else if (this.settings.mode === 'career') {
      seed = Number.parseInt(seasonKey.replace(/\D/g, ''), 10) + this.progression.career.currentMatchIndex * 17;
    }
    this.currentSeed = seed;

    if (this.setup.mode === 'challenge') {
      this.schedule = buildShotSchedule(this.patternCatalog, {
        seed,
        mode: this.setup.mode,
        difficulty: challenge.difficulty,
        patternId: challenge.patternId,
        shotCount: challenge.shotCount,
        durationMs: challenge.win.maxTimeMs
      });
    } else if (this.setup.mode === 'time_attack') {
      this.schedule = buildShotSchedule(this.patternCatalog, {
        seed,
        mode: this.setup.mode,
        difficulty: this.setup.difficulty,
        durationMs: 60_000
      });
    } else if (this.setup.mode === 'ranked') {
      this.schedule = buildRankedSchedule(this.patternCatalog, this.rankedDayKey);
    } else if (this.setup.mode === 'career') {
      this.schedule = buildShotSchedule(this.patternCatalog, {
        seed,
        mode: 'challenge',
        difficulty: careerMatch.difficulty,
        patternId: careerMatch.template.patternId,
        shotCount: careerMatch.template.shotCount
      });
    } else {
      this.schedule = buildShotSchedule(this.patternCatalog, {
        seed,
        mode: this.setup.mode,
        difficulty: this.setup.difficulty,
        shotCount: 160
      });
    }

    this.replayMode = false;
    this.replayPayload = null;
    this.replayCursor = 0;
    this.replayRecorder = this.schedule
      ? new ReplayRecorder({
          setup: this.setup,
          seed: this.currentSeed,
          patternId: this.schedule.patternId,
          shots: this.schedule.shots
        })
      : null;

    this.match = createMatchState(this.setup);
    this.roundState = 'running';
    this.menuContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.howToContainer.setVisible(false);

    this.nextTelegraphIndex = 0;
    this.nextSpawnIndex = 0;
    this.resolvedShots = 0;
    this.perfectStreak = 0;
    this.bestPerfectStreak = 0;
    this.netFlashMs = 0;
    this.diveCooldownUntilMs = 0;
    this.recoveryUntilMs = 0;
    this.pointerDown = null;
    this.holdArmed = false;

    this.goalieZone = 'mid-left';
    this.applyGoalieZone('mid-left', this.setup.controls, 'standard');
    this.clearShots();
    this.updateHud();

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.setup.mode,
      difficulty: this.setup.difficulty,
      controls: this.setup.controls,
      options: {
        assistLaneIndicator: this.setup.options.assistLaneIndicator,
        haptics: this.setup.options.haptics,
        reducedMotion: this.setup.options.reducedMotion,
        lowQuality: this.setup.options.lowQuality
      },
      seed: this.currentSeed,
      patternId: this.schedule.patternId
    });
  }

  private startReplayFromStorage() {
    const replay = loadLastReplay();
    if (!replay) {
      this.hudFeedback.setText('No replay');
      return;
    }
    this.replayPayload = replay;
    this.replayMode = true;
    this.replayCursor = 0;
    this.currentSeed = replay.seed;
    this.setup = replay.setup;
    this.schedule = {
      patternId: replay.patternId,
      shots: replay.shots.map((shot) => ({ ...shot })),
      timingScale: 1
    };
    this.match = createMatchState(replay.setup);
    this.roundState = 'running';
    this.menuContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.howToContainer.setVisible(false);
    this.nextTelegraphIndex = 0;
    this.nextSpawnIndex = 0;
    this.resolvedShots = 0;
    this.perfectStreak = 0;
    this.bestPerfectStreak = 0;
    this.netFlashMs = 0;
    this.goalieZone = 'mid-left';
    this.goalieInput = { zone: 'mid-left', changedAtMs: -100_000, gestureType: 'drag', actionType: 'standard' };
    this.clearShots();
  }

  private stepTimeline() {
    if (!this.schedule) return;
    const nowMs = this.match.elapsedMs;

    while (this.nextTelegraphIndex < this.schedule.shots.length) {
      const shot = this.schedule.shots[this.nextTelegraphIndex];
      if (shot.telegraphAtMs > nowMs) break;
      this.playCue('telegraph');
      this.nextTelegraphIndex += 1;
    }

    while (this.nextSpawnIndex < this.schedule.shots.length) {
      const shot = this.schedule.shots[this.nextSpawnIndex];
      if (shot.spawnAtMs > nowMs) break;
      this.activateShot(this.nextSpawnIndex, shot);
      this.nextSpawnIndex += 1;
    }
  }

  private activateShot(index: number, shot: ScheduledShot) {
    const target = zoneToPoint(shot.zone);
    const spawnX = shot.zone.endsWith('left') ? 300 : 980;
    const spawnY = 90;

    for (let i = 0; i < this.shotPool.length; i += 1) {
      const runtime = this.shotPool[i];
      if (runtime.active) continue;
      runtime.active = true;
      runtime.resolved = false;
      runtime.shotIndex = index;
      runtime.shot = shot;
      runtime.startX = spawnX;
      runtime.startY = spawnY;
      runtime.targetX = target.x;
      runtime.targetY = target.y;
      runtime.x = spawnX;
      runtime.y = spawnY;
      return;
    }
  }

  private stepActiveShots() {
    const nowMs = this.match.elapsedMs;

    for (let i = 0; i < this.shotPool.length; i += 1) {
      const runtime = this.shotPool[i];
      if (!runtime.active || !runtime.shot) continue;
      const shot = runtime.shot;

      const travel = Math.max(1, shot.arriveAtMs - shot.spawnAtMs);
      const t = Phaser.Math.Clamp((nowMs - shot.spawnAtMs) / travel, 0, 1.15);

      runtime.x = runtime.startX + (runtime.targetX - runtime.startX) * t;
      runtime.y = runtime.startY + (runtime.targetY - runtime.startY) * t;

      if (shot.spin) {
        runtime.x += Math.sin(t * Math.PI * 4) * 10;
      }
      if (shot.type === 'curve') {
        runtime.x += (shot.zone.endsWith('left') ? -1 : 1) * Math.sin(t * Math.PI) * 18;
      }
      if (shot.deflection) {
        runtime.y += Math.sin(t * Math.PI * 2) * 5;
      }

      if (!runtime.resolved && nowMs >= shot.arriveAtMs) {
        runtime.resolved = true;
        this.resolveShot(runtime);
      }

      if (t >= 1.12) {
        runtime.active = false;
        runtime.shot = null;
      }
    }
  }

  private resolveShot(runtime: RuntimeShot) {
    if (!runtime.shot) return;

    const shot = runtime.shot;
    const { grade, deltaMs, actionType } = resolveSaveGrade(shot, this.goalieInput, this.setup.difficulty, shot.sequenceIndex);
    const outcome = applyShotResolution(this.match, shot, grade, deltaMs, actionType);
    this.match = outcome.state;
    this.resolvedShots += 1;

    if (grade === 'PERFECT') {
      this.hudFeedback.setText('PERFECT!');
      this.perfectStreak += 1;
      this.bestPerfectStreak = Math.max(this.bestPerfectStreak, this.perfectStreak);
      this.vfxPool.emitSave(runtime.x, runtime.y, true, this.settings.reducedMotion || this.settings.lowQuality);
      if (!this.settings.reducedMotion) this.cameras.main.shake(70, 0.003);
      this.pulseCamera(0.03, 140);
      emitHaptic(this.settings.haptics, [10, 12, 14]);
      this.playCue('perfect');
    } else if (grade === 'GOOD') {
      this.hudFeedback.setText('SAVE');
      this.perfectStreak = 0;
      this.vfxPool.emitSave(runtime.x, runtime.y, false, this.settings.reducedMotion || this.settings.lowQuality);
      this.pulseCamera(0.018, 120);
      emitHaptic(this.settings.haptics, 10);
      this.playCue('save');
    } else if (grade === 'LATE') {
      this.hudFeedback.setText('LATE SAVE');
      this.perfectStreak = 0;
      this.vfxPool.emitSave(runtime.x, runtime.y, false, true);
      this.pulseCamera(0.014, 100);
      emitHaptic(this.settings.haptics, 8);
      this.playCue('late');
    } else {
      this.hudFeedback.setText('GOAL');
      this.perfectStreak = 0;
      this.netFlashMs = 180;
      if (actionType === 'desperation_dive') {
        this.recoveryUntilMs = this.match.elapsedMs + DIVE_MISS_RECOVERY_MS;
      }
      this.vfxPool.emitGoal(runtime.targetX, runtime.targetY + 40, this.settings.reducedMotion || this.settings.lowQuality);
      this.pulseCamera(0.024, 130);
      emitHaptic(this.settings.haptics, [20, 18, 20]);
      this.playCue('goal');
    }

    if (actionType !== 'standard' && grade !== 'MISS') {
      if (actionType === 'poke_check') this.hudFeedback.setText('POKE CHECK');
      if (actionType === 'glove_snag') this.hudFeedback.setText('GLOVE SNAG');
      if (actionType === 'desperation_dive') this.hudFeedback.setText('DIVE SAVE');
    }

    this.goalieInput = { ...this.goalieInput, actionType: 'standard', coveredZones: undefined, holdDurationMs: undefined };
    runtime.active = false;
    runtime.shot = null;
  }

  private updateGoalie(dtSec: number) {
    const prevX = this.goalieX;
    if (this.settings.controls === 'drag') {
      const next = this.drag.update(this.goalieX, this.goalieY, dtSec, this.settings.sensitivity);
      this.goalieX = next.x;
      this.goalieY = next.y;
    } else {
      const target = zoneToGoaliePosition(this.goalieZone);
      this.goalieX = Phaser.Math.Linear(this.goalieX, target.x, 0.28);
      this.goalieY = Phaser.Math.Linear(this.goalieY, target.y, 0.32);
    }

    const lateralSpeed = dtSec > 0 ? Math.abs(this.goalieX - prevX) / dtSec : 0;
    if (lateralSpeed >= 420) {
      const dir: -1 | 1 = this.goalieX >= prevX ? 1 : -1;
      this.vfxPool.emitIceSpray(
        this.goalieX,
        this.goalieY + 44,
        dir,
        this.settings.reducedMotion || this.settings.lowQuality,
        this.iceTrailColor
      );
    }

    this.goalieBody.setPosition(this.goalieX, this.goalieY);
    this.goalieMask.setPosition(this.goalieX, this.goalieY - 60);
    this.goalieGlove.setPosition(this.goalieX - 92, this.goalieY + 6);
    this.goalieStick.setPosition(this.goalieX + 92, this.goalieY + 16);
  }

  private applyGoalieZone(zone: GoalieZone, gestureType: 'drag' | 'tap_dive', actionType: SaveActionType = 'standard') {
    this.goalieZone = zone;
    this.goalieInput = {
      zone,
      changedAtMs: this.match?.elapsedMs ?? 0,
      gestureType,
      actionType
    };
    this.replayRecorder?.recordInput(this.goalieInput);

    if (gestureType === 'tap_dive') {
      const target = zoneToGoaliePosition(zone);
      this.goalieX = target.x;
      this.goalieY = target.y;
    }
  }

  private applyActionInput(
    zone: GoalieZone,
    gestureType: 'drag' | 'tap_dive',
    actionType: SaveActionType,
    coveredZones?: readonly GoalieZone[],
    holdDurationMs?: number
  ) {
    if (this.match.elapsedMs < this.recoveryUntilMs) return;
    this.goalieZone = zone;
    this.goalieInput = {
      zone,
      changedAtMs: this.match?.elapsedMs ?? 0,
      gestureType,
      actionType,
      coveredZones,
      holdDurationMs
    };
    this.replayRecorder?.recordInput(this.goalieInput);
    if (gestureType === 'tap_dive' || actionType === 'desperation_dive') {
      const target = zoneToGoaliePosition(zone);
      this.goalieX = target.x;
      this.goalieY = target.y;
    }
  }

  private applyCosmeticLoadoutVisuals() {
    const loadout = this.progression.equippedCosmetics;
    const mask = cosmeticPreviewColor(this.cosmeticCatalog, loadout.mask, this.stats.selectedMaskColor);
    const pads = cosmeticPreviewColor(this.cosmeticCatalog, loadout.pads, '#ecf5ff');
    const glove = cosmeticPreviewColor(this.cosmeticCatalog, loadout.glove, '#95dbff');
    const stick = cosmeticPreviewColor(this.cosmeticCatalog, loadout.stick_tape, '#c4d4de');
    const trail = cosmeticPreviewColor(this.cosmeticCatalog, loadout.ice_trail, '#dcf7ff');

    this.stats.selectedMaskColor = mask;
    saveGoalieStats(this.stats);

    this.goalieMask.setFillStyle(Number.parseInt(mask.replace('#', '0x'), 16) || 0xf2f7ff);
    this.goalieBody.setFillStyle(Number.parseInt(pads.replace('#', '0x'), 16) || 0xecf5ff);
    this.goalieGlove.setFillStyle(Number.parseInt(glove.replace('#', '0x'), 16) || 0x95dbff);
    this.goalieStick.setFillStyle(Number.parseInt(stick.replace('#', '0x'), 16) || 0xc4d4de);
    this.iceTrailColor = Number.parseInt(trail.replace('#', '0x'), 16) || 0xdcf7ff;
  }

  private evaluateChallengeEnd() {
    if (!this.schedule || this.setup.mode !== 'challenge') return;

    const challenge = this.useDailyChallenge
      ? getDailyChallenge(this.challengeCatalog.challenges)
      : this.challengeCatalog.challenges[this.challengeIndex];

    const evaluation = evaluateChallenge(challenge, {
      saves: this.match.stats.saves,
      misses: this.match.stats.misses,
      perfectSaves: this.match.stats.perfectSaves,
      lateSaves: this.match.stats.lateSaves,
      bestPerfectStreak: this.bestPerfectStreak,
      elapsedMs: this.match.elapsedMs
    });

    if (evaluation.failed) {
      this.finishMatch('challenge');
      return;
    }

    if (this.resolvedShots >= this.schedule.shots.length && evaluation.passed) {
      this.stats.challengeCompletion[challenge.id] = true;
      saveGoalieStats(this.stats);
      this.finishMatch('challenge');
    }
  }

  private finishMatch(reason: 'lives' | 'time' | 'challenge') {
    this.roundState = 'ended';
    this.match = finalizeMatch(this.match);
    this.endContainer.setVisible(true);
    this.menuContainer.setVisible(false);
    this.howToContainer.setVisible(false);

    const challenge = this.setup.mode === 'challenge'
      ? this.useDailyChallenge
        ? getDailyChallenge(this.challengeCatalog.challenges)
        : this.challengeCatalog.challenges[this.challengeIndex]
      : null;
    const careerMatch =
      this.setup.mode === 'career' && this.careerSeason
        ? this.careerSeason.matches[Math.min(this.progression.career.currentMatchIndex, this.careerSeason.matches.length - 1)]
        : null;
    const careerObjectivePassed = careerMatch
      ? evaluateCareerObjective(careerMatch.template.objective, {
          saves: this.match.stats.saves,
          goalsAllowed: this.match.stats.misses,
          bestStreak: this.match.stats.bestStreak,
          alive: this.match.lives > 0
        })
      : false;

    const rewards = calculateRewards({
      mode: this.setup.mode,
      score: this.match.score,
      stats: this.match.stats,
      matchCompleted: true,
      challengeCompleted: !!challenge && this.stats.challengeCompletion[challenge.id] === true,
      rankedCompleted: this.setup.mode === 'ranked',
      careerObjectivePassed
    });
    const levelBefore = this.progression.level;

    if (!this.replayMode) {
      this.stats = updateStatsAfterMatch(this.stats, this.setup.mode, {
        saves: this.match.stats.saves,
        perfectSaves: this.match.stats.perfectSaves,
        bestStreak: this.match.stats.bestStreak,
        score: this.match.score,
        completedChallengeId: challenge && this.stats.challengeCompletion[challenge.id] ? challenge.id : undefined
      });

      saveGoalieStats(this.stats);

      this.progression = applyRewardsToProgression(this.progression, rewards);
      if (careerMatch && this.careerSeason) {
        const ratingDelta = calculateSeasonRatingDelta({
          tier: careerMatch.template.opponentTier,
          objectivePassed: careerObjectivePassed,
          goalsAllowed: this.match.stats.misses,
          bestStreak: this.match.stats.bestStreak,
          perfectRate: this.match.stats.shotsFaced > 0 ? this.match.stats.perfectSaves / this.match.stats.shotsFaced : 0,
          isFinals: careerMatch.isFinals
        });
        this.progression = recordCareerMatchResult(this.progression, {
          seasonKey: this.careerSeason.seasonKey,
          completedMatchesInSeason: this.progression.career.currentMatchIndex + 1,
          won: careerObjectivePassed,
          ratingDelta,
          bestStreak: this.match.stats.bestStreak,
          score: this.match.score,
          seasonComplete: this.progression.career.currentMatchIndex + 1 >= this.careerSeason.matches.length
        });
      }

      const achievementEval = evaluateAchievements(this.achievementCatalog, this.progression.achievements, {
        lifetimePerfectSaves: this.stats.perfectSaves,
        lifetimeSaves: this.stats.totalSaves,
        lifetimeReboundSaves: this.match.stats.reboundsSaved + (this.progression.achievements['rebound-slayer'] ? 20 : 0),
        rankedTier: this.stats.rankedTier,
        matchGoalsAllowed: this.match.stats.misses
      });
      this.progression = {
        ...this.progression,
        achievements: achievementEval.unlocked,
        badges: Array.from(new Set([...this.progression.badges, ...achievementEval.badges]))
      };
      saveGoalieProgression(this.progression);
      this.applyCosmeticLoadoutVisuals();
    }

    if (!this.replayMode && this.replayRecorder) {
      saveLastReplay(this.replayRecorder.finalize(this.match.score));
    }

    const summary = [
      `Mode: ${modeLabel(this.setup.mode)}`,
      reason === 'lives'
        ? 'Out of lives'
        : reason === 'time'
          ? 'Time up'
          : this.setup.mode === 'ranked'
            ? 'Ranked complete'
            : this.setup.mode === 'career'
              ? 'Career match complete'
              : 'Challenge complete',
      `Score: ${this.match.score}`,
      `Saves: ${this.match.stats.saves}`,
      `Perfect: ${this.match.stats.perfectSaves}`,
      `Misses: ${this.match.stats.misses}`,
      `Best Streak: ${this.match.stats.bestStreak}`,
      `Best Ever Streak: ${this.stats.bestStreak}`,
      `Rewards: +${rewards.coins} coins, +${rewards.xp} xp`,
      `Level: ${levelBefore} -> ${this.progression.level}`
    ];

    if (challenge) {
      summary.push(`Challenge: ${challenge.name}`);
    }
    if (this.setup.mode === 'ranked') {
      summary.push(`Ranked day: ${this.rankedDayKey}`);
      summary.push(`Rank tier: ${resolveRankTier(this.match.score)}`);
    }
    if (this.setup.mode === 'career' && careerMatch) {
      summary.push(`Career match: ${careerMatch.template.name}`);
      summary.push(`Objective: ${careerObjectivePassed ? 'PASSED' : 'FAILED'}`);
      summary.push(`Season ladder: ${this.progression.seasonTier} (${this.progression.seasonRating})`);
      const recap = this.progression.career.seasonHistory[0];
      if (recap && recap.seasonKey === this.careerSeason?.seasonKey) {
        summary.push(`Season recap: ${recap.wins}W-${recap.losses}L, score ${recap.totalScore}`);
      }
    }
    if (this.replayMode && this.replayPayload) {
      const predicted = simulateReplayOutcome(this.replayPayload);
      summary.push(`Replay check: ${predicted.score === this.match.score ? 'deterministic' : 'diverged'}`);
    }

    this.endSummary.setText(summary.join('\n'));

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.setup.mode,
      score: this.match.score,
      stats: this.match.stats,
      challengeId: challenge?.id,
      reason
    });
  }

  private clearShots() {
    for (let i = 0; i < this.shotPool.length; i += 1) {
      this.shotPool[i].active = false;
      this.shotPool[i].shot = null;
      this.shotPool[i].resolved = false;
    }
  }

  private renderShots() {
    this.rinkGfx.clear();
    this.shotsGfx.clear();
    this.vfxGfx.clear();

    const rinkBase = this.setup?.mode === 'ranked' ? 0x120b26 : 0x071523;
    const rinkInner = this.setup?.mode === 'ranked' ? 0x251545 : 0x0e2a42;
    this.rinkGfx.fillStyle(rinkBase, 1);
    this.rinkGfx.fillRect(0, 0, 1280, 720);

    this.rinkGfx.fillStyle(rinkInner, 1);
    this.rinkGfx.fillRoundedRect(250, 70, 780, 590, 26);

    this.rinkGfx.lineStyle(3, 0xe8f4ff, 0.85);
    this.rinkGfx.strokeRoundedRect(250, 70, 780, 590, 26);

    this.rinkGfx.lineStyle(2, 0x88d3ff, 0.35);
    this.rinkGfx.strokeEllipse(640, 578, 420, 130);

    const crowdEnergy = Phaser.Math.Clamp((this.match?.stats.streak ?? 0) / 12, 0.08, 0.9);
    this.rinkGfx.fillStyle(this.setup?.mode === 'ranked' ? 0xa96dff : 0x6db5ff, 0.1 + crowdEnergy * 0.35);
    this.rinkGfx.fillRect(250, 56, 780, 12);

    if (this.netFlashMs > 0) {
      this.rinkGfx.fillStyle(modeNetFlash(this.setup?.mode ?? 'survival'), this.netFlashMs / 260);
      this.rinkGfx.fillRoundedRect(250, 70, 780, 590, 26);
    }

    if (this.settings.assistLaneIndicator && this.roundState === 'running' && this.schedule && this.nextSpawnIndex < this.schedule.shots.length) {
      const incoming = this.schedule.shots[this.nextSpawnIndex];
      const shiftMs = incoming.fake && incoming.fakeShiftAtMs !== null ? incoming.telegraphAtMs + incoming.fakeShiftAtMs : Number.POSITIVE_INFINITY;
      const telegraphZone = this.match.elapsedMs >= shiftMs ? incoming.realZone : incoming.telegraphZone;
      const zonePoint = zoneToPoint(telegraphZone);
      this.rinkGfx.fillStyle(0xffe17f, this.settings.preLaneIndicator ? 0.25 : 0.12);
      this.rinkGfx.fillCircle(zonePoint.x, zonePoint.y, 34);
    }

    for (let i = 0; i < this.shotPool.length; i += 1) {
      const runtime = this.shotPool[i];
      if (!runtime.active || !runtime.shot) continue;
      const shot = runtime.shot;
      const color = shot.type === 'one_timer' ? 0xffaa8f : shot.type === 'curve' ? 0x91f3ff : 0xf3fbff;
      this.shotsGfx.lineStyle(3, color, 0.12);
      this.shotsGfx.strokeCircle(runtime.x, runtime.y, 18);
      this.shotsGfx.fillStyle(color, 0.96);
      this.shotsGfx.fillCircle(runtime.x, runtime.y, 11);
      this.shotsGfx.lineStyle(2, 0x1c3b53, 0.9);
      this.shotsGfx.strokeCircle(runtime.x, runtime.y, 11);

      if (shot.telegraph === 'glow' || shot.telegraph === 'both') {
        this.shotsGfx.fillStyle(color, 0.15);
        this.shotsGfx.fillCircle(runtime.x, runtime.y, 19);
      }

      this.shotsGfx.lineStyle(2, color, 0.18);
      this.shotsGfx.lineBetween(runtime.startX, runtime.startY, runtime.x, runtime.y);
    }

    this.vfxPool.render(this.vfxGfx);
  }

  private pulseCamera(intensity: number, durationMs: number) {
    if (this.settings.reducedMotion) return;
    if (this.cameraPulseActive) return;
    const camera = this.cameras.main;
    this.cameraPulseActive = true;
    this.tweens.add({
      targets: camera,
      zoom: 1 + intensity,
      duration: durationMs,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        camera.setZoom(1);
        this.cameraPulseActive = false;
      }
    });
  }

  private updateHud() {
    if (!this.setup) return;
    const timeLeft = this.setup.mode === 'time_attack' ? Math.max(0, Math.ceil((60_000 - this.match.elapsedMs) / 1000)) : null;

    this.hudTop.setText(
      `Score ${this.match.score} | Saves ${this.match.stats.saves} | Streak ${this.match.stats.streak} | x${this.match.streakMultiplier.toFixed(2)}`
    );

    if (this.setup.mode === 'survival') {
      this.hudSub.setText(
        `Lives ${this.match.lives} | Perfect ${this.match.stats.perfectSaves} | Protect ${this.match.streakProtectionCharges} | Misses ${this.match.stats.misses}`
      );
    } else if (this.setup.mode === 'time_attack') {
      this.hudSub.setText(`Time ${timeLeft}s | Perfect ${this.match.stats.perfectSaves} | Late ${this.match.stats.lateSaves}`);
    } else if (this.setup.mode === 'career') {
      const season = this.careerSeason ?? generateCareerSeason(this.careerCatalog, utcWeekKey(), this.progression.profileSeed);
      const idx = Math.min(this.progression.career.currentMatchIndex, season.matches.length - 1);
      const objective = season.matches[idx].template.objective;
      const objectiveText =
        objective.type === 'save_target'
          ? `Save ${objective.savesTarget}`
          : objective.type === 'goals_under'
            ? `Goals <= ${objective.maxGoals}`
            : objective.type === 'streak_target'
              ? `Streak ${objective.streakTarget}`
              : 'Sudden Death';
      this.hudSub.setText(
        `Career ${season.seasonKey} Match ${idx + 1}/12 | ${objectiveText} | Tier ${this.progression.seasonTier}`
      );
    } else if (this.setup.mode === 'ranked') {
      const round = this.schedule?.shots[this.nextSpawnIndex]?.roundIndex ?? 9;
      this.hudSub.setText(
        `Ranked ${this.rankedDayKey} | Round ${Math.min(10, round + 1)}/10 | Tier ${resolveRankTier(this.match.score)}`
      );
    } else {
      const challenge = this.useDailyChallenge
        ? getDailyChallenge(this.challengeCatalog.challenges)
        : this.challengeCatalog.challenges[this.challengeIndex];
      this.hudSub.setText(`Challenge ${challenge.name} | Perfect Streak ${this.bestPerfectStreak}`);
    }

    if (this.schedule && this.nextSpawnIndex < this.schedule.shots.length) {
      const incoming = this.schedule.shots[this.nextSpawnIndex];
      const shiftMs = incoming.fake && incoming.fakeShiftAtMs !== null ? incoming.telegraphAtMs + incoming.fakeShiftAtMs : Number.POSITIVE_INFINITY;
      const telegraphZone = this.match.elapsedMs >= shiftMs ? incoming.realZone : incoming.telegraphZone;
      this.hudIncoming.setText(`Incoming: ${telegraphZone.toUpperCase()}${incoming.rebound ? ' REBOUND' : ''}`);
    } else {
      this.hudIncoming.setText('Incoming: --');
    }

    if (this.roundState === 'paused') {
      this.hudFeedback.setText('PAUSED');
    } else if (this.replayMode) {
      this.hudFeedback.setText('REPLAY');
    }
  }

  private playCue(cue: AudioCue) {
    if (this.sound.mute) return;
    if (cue === 'crowd') return;
  }
}
