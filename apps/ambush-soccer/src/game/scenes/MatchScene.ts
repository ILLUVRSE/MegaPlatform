import Phaser from 'phaser';
import { Arena } from '../entities/Arena';
import { Ball } from '../entities/Ball';
import { Goal } from '../entities/Goal';
import { Player } from '../entities/Player';
import { TUNING } from '../config/tuning';
import { clamp, distance, normalize } from '../../shared/math';
import type { Mode, PlayerInputState, TeamSide } from '../../shared/types';
import { AISystem } from '../systems/AISystem';
import { GoalieAI } from '../systems/GoalieAI';
import { InputSystem } from '../systems/InputSystem';
import { MatchSystem } from '../systems/MatchSystem';
import { PhysicsSystem, computeShotPower, isBallInGoal, updateStamina } from '../systems/PhysicsSystem';
import { selectPassTarget } from '../systems/Passing';
import { HUD } from '../ui/HUD';
import { getOnlineSession } from '../net/onlineService';
import type { OnlineSession } from '../net/OnlineSession';
import { NetDebugOverlay } from '../net/NetDebugOverlay';
import { OnlineMatchDriver } from '../net/OnlineMatchDriver';
import { OfflineMatchDriver } from '../net/OfflineMatchDriver';
import type { IMatchDriver } from '../net/IMatchDriver';
import { checksumState, type MatchSnapshotState } from '../../shared/net/protocol';
import { computeStateError, smoothCorrection } from '../net/Reconciliation';

interface OnlineSceneData {
  matchId: string;
  hostClientId: string;
  clientId: string | null;
  seed: number;
  startAtTick: number;
}

export class MatchScene extends Phaser.Scene {
  private mode: Mode = 'quick';
  private arena = new Arena();
  private ball!: Ball;
  private goals: Goal[] = [];
  private players: Player[] = [];
  private playerGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private controlRings = new Map<string, Phaser.GameObjects.Arc>();
  private ballGraphic!: Phaser.GameObjects.Arc;
  private hud!: HUD;

  private inputSystem = new InputSystem();
  private physicsSystem = new PhysicsSystem();
  private matchSystem!: MatchSystem;
  private aiSystem = new AISystem();
  private goalieAI = new GoalieAI();

  private driver: IMatchDriver = new OfflineMatchDriver();
  private onlineDriver: OnlineMatchDriver | null = null;
  private netOverlay: NetDebugOverlay | null = null;
  private onlineData: OnlineSceneData | null = null;
  private onlineSession: OnlineSession | null = null;
  private onlineLocalPlayerId: string | null = null;
  private onlineRemotePlayerId: string | null = null;
  private forfeitHandled = false;
  private disconnectPauseSec = 0;

  private activeControlledBySlot: Record<0 | 1, string | null> = { 0: null, 1: null };

  constructor() {
    super('match');
  }

  create(data: { mode?: Mode; online?: OnlineSceneData }): void {
    this.mode = data.mode ?? 'quick';
    this.onlineData = data.online ?? null;
    this.matchSystem = new MatchSystem(this.mode);
    this.inputSystem.bind(this);

    this.cameras.main.setBackgroundColor('#0d271f');
    this.cameras.main.setBounds(0, 0, this.arena.width, this.arena.height);

    this.drawArena();
    this.spawnEntities();
    this.hud = new HUD(this);
    this.hud.update(this.matchSystem.state);

    if (this.mode === 'online' && this.onlineData) {
      const session = getOnlineSession();
      this.onlineSession = session;
      this.onlineDriver = new OnlineMatchDriver(session, this.onlineData.matchId, this.onlineData.hostClientId, {
        readLocalInput: () => this.inputSystem.read(0),
        applyPredictedLocalInput: (input, dt) => {
          const player = this.getPlayerById(this.onlineLocalPlayerId);
          if (player) {
            this.applyInputToPlayer(player, input, dt);
          }
        },
        applyRemoteInputAsHost: (input, dt) => {
          const player = this.getPlayerById(this.onlineRemotePlayerId);
          if (player) {
            this.applyInputToPlayer(player, input, dt);
          }
        },
        captureSnapshot: () => this.captureSnapshot(),
        applyAuthoritativeSnapshot: (state, hard) => this.applySnapshotState(state, hard),
        computePredictionError: (state) => this.computePredictionError(state),
        onForfeitWin: () => {
          this.forfeitHandled = true;
          this.scene.start('results', { match: this.matchSystem.state });
        }
      });
      this.driver = this.onlineDriver;
      this.netOverlay = new NetDebugOverlay(this);
      this.hud.showBanner('Online: waiting for both players READY...');
    }
  }

  update(_: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);

    if (!this.forfeitHandled && this.matchSystem.isEnded()) {
      this.scene.start('results', { match: this.matchSystem.state });
      return;
    }

    if (this.mode === 'online' && this.onlineDriver) {
      if (this.onlineSession?.disconnectedClientId) {
        if (this.disconnectPauseSec <= 0) {
          this.disconnectPauseSec = 10;
        }
        this.disconnectPauseSec = Math.max(0, this.disconnectPauseSec - dt);
        this.hud.showBanner(`Opponent disconnected. Resume in ${this.disconnectPauseSec.toFixed(1)}s`);
        if (this.disconnectPauseSec <= 0 && !this.forfeitHandled) {
          this.forfeitHandled = true;
          const localIsHome = this.onlineData?.clientId === this.onlineData?.hostClientId;
          if (localIsHome) {
            this.matchSystem.state.homeScore += 1;
          } else {
            this.matchSystem.state.awayScore += 1;
          }
          this.scene.start('results', { match: this.matchSystem.state });
          return;
        }
        this.hud.update(this.matchSystem.state);
        this.syncGraphics();
        return;
      }
      this.disconnectPauseSec = 0;
      this.driver.update(dt);
      if (!this.onlineDriver.hasStarted()) {
        this.hud.update(this.matchSystem.state);
        this.syncGraphics();
        return;
      }
    }

    if (!this.matchSystem.state.isPausedForGoal) {
      if (this.mode !== 'online') {
        this.handleHumanInputs(dt);
      }
      this.aiSystem.update(this.players, this.ball, dt);
      for (const goalie of this.players.filter((p) => p.isGoalie)) {
        this.goalieAI.update(goalie, this.ball, dt, (team) => {
          if (team === 'home') {
            this.matchSystem.state.stats.savesHome += 1;
          } else {
            this.matchSystem.state.stats.savesAway += 1;
          }
        });
      }
      this.applyDribbleInfluence(dt);
      this.tryTackleInteractions();
      this.physicsSystem.step(this.ball, this.players, dt, this.arena.bounds);
      this.detectGoals();
    }

    this.matchSystem.tick(dt);
    if (!this.matchSystem.state.isPausedForGoal) {
      this.hud.hideBanner();
    }
    this.hud.update(this.matchSystem.state);

    if (this.netOverlay && this.onlineDriver) {
      this.netOverlay.update(
        this.onlineDriver.getPingMs(),
        this.onlineDriver.getLocalTick(),
        this.onlineDriver.getServerTick(),
        this.onlineDriver.getPacketLossEstimate()
      );
    }

    this.updateCamera();
    this.syncGraphics();
  }

  private drawArena(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0f3b2d, 1).fillRect(0, 0, this.arena.width, this.arena.height);
    g.lineStyle(TUNING.arena.wallThickness, 0xb8f2d7, 1).strokeRect(0, 0, this.arena.width, this.arena.height);
    g.lineStyle(3, 0x7fd6ad, 1).lineBetween(this.arena.width / 2, 0, this.arena.width / 2, this.arena.height);
    g.strokeCircle(this.arena.width / 2, this.arena.height / 2, 80);

    const midY = this.arena.height / 2;
    const goalTop = midY - TUNING.arena.goalHeight / 2;
    const leftGoal = new Goal(0, goalTop, TUNING.arena.goalWidth, TUNING.arena.goalHeight, 'home');
    const rightGoal = new Goal(this.arena.width - TUNING.arena.goalWidth, goalTop, TUNING.arena.goalWidth, TUNING.arena.goalHeight, 'away');
    this.goals = [leftGoal, rightGoal];

    g.fillStyle(0x245543, 1);
    g.fillRect(leftGoal.rect.x, leftGoal.rect.y, leftGoal.rect.width, leftGoal.rect.height);
    g.fillRect(rightGoal.rect.x, rightGoal.rect.y, rightGoal.rect.width, rightGoal.rect.height);
  }

  private spawnEntities(): void {
    this.players = [];

    const homeGoalie = new Player('home-gk', 'home', 64, this.arena.height / 2, TUNING.player.radius);
    homeGoalie.isGoalie = true;
    const awayGoalie = new Player('away-gk', 'away', this.arena.width - 64, this.arena.height / 2, TUNING.player.radius);
    awayGoalie.isGoalie = true;

    const home1 = new Player('home-1', 'home', 280, this.arena.height / 2 - 120, TUNING.player.radius);
    const home2 = new Player('home-2', 'home', 280, this.arena.height / 2 + 120, TUNING.player.radius);
    const away1 = new Player('away-1', 'away', this.arena.width - 280, this.arena.height / 2 - 120, TUNING.player.radius);
    const away2 = new Player('away-2', 'away', this.arena.width - 280, this.arena.height / 2 + 120, TUNING.player.radius);

    this.players.push(homeGoalie, home1, home2, awayGoalie, away1, away2);

    this.assignControl();

    this.ball = new Ball(this.arena.center.x, this.arena.center.y, TUNING.ball.radius);

    for (const p of this.players) {
      const color = p.team === 'home' ? 0x2dd8ff : 0xff7f50;
      const arc = this.add.circle(p.position.x, p.position.y, p.radius, color, 1);
      this.playerGraphics.set(p.id, arc);

      const ring = this.add.circle(p.position.x, p.position.y, p.radius + 6, 0xfff6a3, 0).setStrokeStyle(2, 0xfff6a3, 1);
      this.controlRings.set(p.id, ring);
    }

    this.ballGraphic = this.add.circle(this.ball.position.x, this.ball.position.y, this.ball.radius, 0xf9f9f9, 1);
  }

  private assignControl(): void {
    const homeField = this.players.filter((p) => p.team === 'home' && !p.isGoalie);
    const awayField = this.players.filter((p) => p.team === 'away' && !p.isGoalie);

    for (const p of this.players) {
      p.isHumanControlled = false;
      p.controllerSlot = null;
    }

    if (this.mode === 'quick' || this.mode === 'practice') {
      homeField[0].isHumanControlled = true;
      homeField[0].controllerSlot = 0;
      this.activeControlledBySlot[0] = homeField[0].id;
      this.activeControlledBySlot[1] = null;
    } else if (this.mode === 'local-versus') {
      homeField[0].isHumanControlled = true;
      homeField[0].controllerSlot = 0;
      awayField[0].isHumanControlled = true;
      awayField[0].controllerSlot = 1;
      this.activeControlledBySlot[0] = homeField[0].id;
      this.activeControlledBySlot[1] = awayField[0].id;
    } else if (this.mode === 'online' && this.onlineData) {
      const isHost = this.onlineData.clientId === this.onlineData.hostClientId;
      const local = isHost ? homeField[0] : awayField[0];
      const remote = isHost ? awayField[0] : homeField[0];

      local.isHumanControlled = true;
      local.controllerSlot = 0;
      remote.isHumanControlled = true;
      remote.controllerSlot = null;

      this.onlineLocalPlayerId = local.id;
      this.onlineRemotePlayerId = remote.id;
      this.activeControlledBySlot[0] = local.id;
      this.activeControlledBySlot[1] = null;
    }
  }

  private handleHumanInputs(dt: number): void {
    const slots: Array<0 | 1> = [0, 1];

    for (const slot of slots) {
      const controlledId = this.activeControlledBySlot[slot];
      if (!controlledId) {
        continue;
      }
      const player = this.players.find((p) => p.id === controlledId);
      if (!player) {
        continue;
      }

      const input = this.inputSystem.read(slot);
      if (input.switchPressed) {
        this.switchControlledPlayer(slot, player.team);
      }
      this.applyInputToPlayer(player, input, dt);
    }
  }

  private applyInputToPlayer(player: Player, input: PlayerInputState, dt: number): void {
    const dir = normalize({ x: input.moveX, y: input.moveY });
    const wantsSprint = input.sprint && player.stamina > TUNING.player.staminaSprintThreshold;
    const maxSpeed = wantsSprint ? TUNING.player.sprintSpeed : TUNING.player.walkSpeed;

    player.stamina = updateStamina(player.stamina, wantsSprint && Math.hypot(input.moveX, input.moveY) > 0.1, dt);

    const targetVelX = dir.x * maxSpeed;
    const targetVelY = dir.y * maxSpeed;
    const accel = TUNING.player.acceleration * dt;
    player.velocity.x += clamp(targetVelX - player.velocity.x, -accel, accel);
    player.velocity.y += clamp(targetVelY - player.velocity.y, -accel, accel);

    if (Math.hypot(dir.x, dir.y) > 0.05) {
      player.facing = dir;
    }

    const ownsBall = this.ball.ownerId === player.id || distance(player.position, this.ball.position) < TUNING.player.dribbleInfluenceRadius;

    if (input.passPressed && ownsBall) {
      this.passBall(player, dir);
    }

    if (input.shootHeld && ownsBall) {
      player.shootChargeSec = Math.min(player.shootChargeSec + dt, TUNING.ball.shootChargeTimeSec);
    }

    if (input.shootReleased && ownsBall) {
      this.shootBall(player);
    }

    if (input.tacklePressed && player.tackleCooldown <= 0) {
      player.tackleCooldown = TUNING.player.tackleCooldownSec;
      this.tryTackle(player);
    }
  }

  private passBall(player: Player, aim: { x: number; y: number }): void {
    const candidates = this.players
      .filter((p) => p.team === player.team && p.id !== player.id && !p.isGoalie)
      .map((p) => ({
        id: p.id,
        team: p.team,
        fromBallOwner: true,
        position: p.position
      }));

    const target = selectPassTarget(player.position, aim, candidates);
    const destination = target?.position ?? { x: player.position.x + player.facing.x * 110, y: player.position.y + player.facing.y * 110 };

    const direction = normalize({ x: destination.x - this.ball.position.x, y: destination.y - this.ball.position.y });
    const speed = TUNING.ball.passMinSpeed + Math.hypot(player.velocity.x, player.velocity.y) * 0.35;
    this.ball.velocity.x = direction.x * clamp(speed, TUNING.ball.passMinSpeed, TUNING.ball.passMaxSpeed);
    this.ball.velocity.y = direction.y * clamp(speed, TUNING.ball.passMinSpeed, TUNING.ball.passMaxSpeed);
    this.ball.ownerId = null;
  }

  private shootBall(player: Player): void {
    const power = computeShotPower(player.shootChargeSec);
    player.shootChargeSec = 0;

    const aim = normalize(player.facing);
    const t = clamp((power - TUNING.ball.shootMinPower) / (TUNING.ball.shootMaxPower - TUNING.ball.shootMinPower), 0, 1);
    const spreadDeg = t > 0.95 ? (Math.random() - 0.5) * TUNING.ball.maxPowerSpreadDeg : 0;
    const spreadRad = (spreadDeg * Math.PI) / 180;
    const cos = Math.cos(spreadRad);
    const sin = Math.sin(spreadRad);
    const shotX = aim.x * cos - aim.y * sin;
    const shotY = aim.x * sin + aim.y * cos;

    this.ball.velocity.x = shotX * power;
    this.ball.velocity.y = shotY * power;
    this.ball.ownerId = null;

    if (player.team === 'home') {
      this.matchSystem.state.stats.shotsHome += 1;
    } else {
      this.matchSystem.state.stats.shotsAway += 1;
    }
  }

  private tryTackle(player: Player): void {
    for (const opp of this.players.filter((p) => p.team !== player.team && !p.isGoalie)) {
      if (distance(player.position, opp.position) < TUNING.player.tackleRange) {
        opp.velocity.x += player.facing.x * 120;
        opp.velocity.y += player.facing.y * 120;
        if (this.ball.ownerId === opp.id) {
          this.ball.ownerId = null;
          this.ball.velocity.x += player.facing.x * 170;
          this.ball.velocity.y += player.facing.y * 170;
        }
        if (player.team === 'home') {
          this.matchSystem.state.stats.tacklesHome += 1;
        } else {
          this.matchSystem.state.stats.tacklesAway += 1;
        }
      }
    }
  }

  private tryTackleInteractions(): void {
    for (const p of this.players) {
      for (const q of this.players) {
        if (p.id >= q.id || p.team === q.team) {
          continue;
        }
        const d = distance(p.position, q.position);
        const minDist = p.radius + q.radius;
        if (d < minDist && d > 0.001) {
          const n = normalize({ x: p.position.x - q.position.x, y: p.position.y - q.position.y });
          const push = (minDist - d) * 0.5;
          p.position.x += n.x * push;
          p.position.y += n.y * push;
          q.position.x -= n.x * push;
          q.position.y -= n.y * push;
        }
      }
    }
  }

  private applyDribbleInfluence(dt: number): void {
    let nearest: Player | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const p of this.players.filter((pl) => !pl.isGoalie)) {
      const d = distance(p.position, this.ball.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }

    if (!nearest) {
      return;
    }

    if (nearestDist < TUNING.player.dribbleInfluenceRadius) {
      const influence = TUNING.player.dribbleInfluenceStrength;
      const desired = {
        x: nearest.position.x + nearest.facing.x * 20,
        y: nearest.position.y + nearest.facing.y * 20
      };
      this.ball.velocity.x += (desired.x - this.ball.position.x) * influence * dt * 60;
      this.ball.velocity.y += (desired.y - this.ball.position.y) * influence * dt * 60;
      this.ball.ownerId = nearest.id;
    } else {
      this.ball.ownerId = null;
    }
  }

  private detectGoals(): void {
    for (const goal of this.goals) {
      if (!isBallInGoal(this.ball.position.x, this.ball.position.y, this.ball.radius, goal.rect)) {
        continue;
      }
      const scoringTeam: TeamSide = goal.rect.team === 'home' ? 'away' : 'home';
      this.matchSystem.registerGoal(scoringTeam);
      this.hud.showBanner(`${scoringTeam.toUpperCase()} GOAL!`);
      this.resetToKickoff();
      break;
    }
  }

  private resetToKickoff(): void {
    const positions: Record<string, { x: number; y: number }> = {
      'home-gk': { x: 64, y: this.arena.height / 2 },
      'home-1': { x: 280, y: this.arena.height / 2 - 120 },
      'home-2': { x: 280, y: this.arena.height / 2 + 120 },
      'away-gk': { x: this.arena.width - 64, y: this.arena.height / 2 },
      'away-1': { x: this.arena.width - 280, y: this.arena.height / 2 - 120 },
      'away-2': { x: this.arena.width - 280, y: this.arena.height / 2 + 120 }
    };

    for (const p of this.players) {
      const pos = positions[p.id];
      p.setPosition(pos.x, pos.y);
      p.velocity.x = 0;
      p.velocity.y = 0;
      p.shootChargeSec = 0;
      p.facing = { x: p.team === 'home' ? 1 : -1, y: 0 };
    }

    this.ball.setPosition(this.arena.center.x, this.arena.center.y);
    this.ball.setVelocity(0, 0);
    this.ball.ownerId = null;
  }

  private switchControlledPlayer(slot: 0 | 1, team: TeamSide): void {
    const current = this.activeControlledBySlot[slot];
    const candidates = this.players.filter((p) => p.team === team && !p.isGoalie);
    if (candidates.length <= 1) {
      return;
    }

    const idx = Math.max(
      0,
      candidates.findIndex((p) => p.id === current)
    );
    const next = candidates[(idx + 1) % candidates.length];

    for (const p of candidates) {
      if (p.controllerSlot === slot) {
        p.isHumanControlled = false;
        p.controllerSlot = null;
      }
    }

    next.isHumanControlled = true;
    next.controllerSlot = slot;
    this.activeControlledBySlot[slot] = next.id;
  }

  private updateCamera(): void {
    const cam = this.cameras.main;
    const dx = clamp(this.ball.position.x - this.arena.center.x, -TUNING.camera.maxOffsetFromCenterX, TUNING.camera.maxOffsetFromCenterX);
    const dy = clamp(this.ball.position.y - this.arena.center.y, -TUNING.camera.maxOffsetFromCenterY, TUNING.camera.maxOffsetFromCenterY);

    const targetX = dx;
    const targetY = dy;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, TUNING.camera.followLerp);
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, TUNING.camera.followLerp);

    const zoomX = this.scale.width / (this.arena.width + 80);
    const zoomY = this.scale.height / (this.arena.height + 80);
    cam.setZoom(Math.min(zoomX, zoomY));
  }

  private syncGraphics(): void {
    for (const p of this.players) {
      const g = this.playerGraphics.get(p.id);
      const ring = this.controlRings.get(p.id);
      if (!g || !ring) {
        continue;
      }
      g.setPosition(p.position.x, p.position.y);
      ring.setPosition(p.position.x, p.position.y);
      ring.setVisible(p.isHumanControlled && p.controllerSlot !== null);
    }
    this.ballGraphic.setPosition(this.ball.position.x, this.ball.position.y);
  }

  private getPlayerById(id: string | null): Player | null {
    if (!id) {
      return null;
    }
    return this.players.find((p) => p.id === id) ?? null;
  }

  private captureSnapshot(): MatchSnapshotState {
    const state: MatchSnapshotState = {
      players: this.players.map((p) => ({
        id: p.id,
        team: p.team,
        x: p.position.x,
        y: p.position.y,
        vx: p.velocity.x,
        vy: p.velocity.y,
        stamina: p.stamina
      })),
      ball: {
        x: this.ball.position.x,
        y: this.ball.position.y,
        vx: this.ball.velocity.x,
        vy: this.ball.velocity.y,
        ownerId: this.ball.ownerId
      },
      homeScore: this.matchSystem.state.homeScore,
      awayScore: this.matchSystem.state.awayScore,
      timeRemainingSec: this.matchSystem.state.timeRemainingSec,
      inOvertime: this.matchSystem.state.inOvertime,
      checksum: 0
    };
    state.checksum = checksumState(state);
    return state;
  }

  private computePredictionError(state: MatchSnapshotState): number {
    const predicted = this.players.map((p) => ({ id: p.id, x: p.position.x, y: p.position.y }));
    return computeStateError(predicted, state);
  }

  private applySnapshotState(state: MatchSnapshotState, hard: boolean): void {
    for (const sp of state.players) {
      const player = this.getPlayerById(sp.id);
      if (!player) {
        continue;
      }
      if (hard) {
        player.position.x = sp.x;
        player.position.y = sp.y;
      } else {
        player.position.x = smoothCorrection(player.position.x, sp.x, 0.35);
        player.position.y = smoothCorrection(player.position.y, sp.y, 0.35);
      }
      player.velocity.x = sp.vx;
      player.velocity.y = sp.vy;
      player.stamina = sp.stamina;
    }

    if (hard) {
      this.ball.position.x = state.ball.x;
      this.ball.position.y = state.ball.y;
    } else {
      this.ball.position.x = smoothCorrection(this.ball.position.x, state.ball.x, 0.4);
      this.ball.position.y = smoothCorrection(this.ball.position.y, state.ball.y, 0.4);
    }
    this.ball.velocity.x = state.ball.vx;
    this.ball.velocity.y = state.ball.vy;
    this.ball.ownerId = state.ball.ownerId;

    this.matchSystem.state.homeScore = state.homeScore;
    this.matchSystem.state.awayScore = state.awayScore;
    this.matchSystem.state.timeRemainingSec = state.timeRemainingSec;
    this.matchSystem.state.inOvertime = state.inOvertime;
  }
}
