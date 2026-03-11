import { AI_PERSONALITY, DIFFICULTY, FIGHTERS, HEIGHT, LANES, LANE_Y, MOVESETS, WIDTH } from "./data.js";
import { RosterManager } from "./roster/RosterManager.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const choose = (arr) => arr[(Math.random() * arr.length) | 0];

class FighterState {
  constructor(data, x, lane, isPlayer) {
    this.data = data;
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = LANE_Y[lane];
    this.lane = lane;
    this.targetLane = lane;
    this.side = isPlayer ? 1 : -1;
    this.hpMax = data.hp;
    this.hp = data.hp;
    this.rounds = 0;
    this.crouching = false;
    this.guarding = false;
    this.guardTapTimer = 0;
    this.breakBuffer = 0;
    this.move = null;
    this.moveTimer = 0;
    this.movePhase = "idle";
    this.moveHitDone = false;
    this.comboTimer = 0;
    this.evadeTimer = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.launchTimer = 0;
    this.knockdown = 0;
    this.airHits = 0;
    this.armorFrames = 0;
    this.lastUnsafe = 0;
    this.comboCount = 0;
    this.lastHitMove = null;
  }

  resetRound(x, lane) {
    this.x = x;
    this.y = LANE_Y[lane];
    this.lane = lane;
    this.targetLane = lane;
    this.side = this.isPlayer ? 1 : -1;
    this.hp = this.hpMax;
    this.crouching = false;
    this.guarding = false;
    this.guardTapTimer = 0;
    this.breakBuffer = 0;
    this.move = null;
    this.moveTimer = 0;
    this.movePhase = "idle";
    this.moveHitDone = false;
    this.comboTimer = 0;
    this.evadeTimer = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.launchTimer = 0;
    this.knockdown = 0;
    this.airHits = 0;
    this.armorFrames = 0;
    this.lastUnsafe = 0;
    this.comboCount = 0;
    this.lastHitMove = null;
  }

  canAct() {
    return this.hitstun <= 0 && this.blockstun <= 0 && this.knockdown <= 0 && this.launchTimer <= 0 && this.movePhase === "idle";
  }
}

export class GameEngine {
  constructor() {
    this.timeMs = 0;
    this.paused = false;
    this.debugEnabled = false;
    this.round = 1;
    this.roundTimer = 90;
    this.roundTime = 90;
    this.events = [];
    this.pendingRound = null;

    this.player = new FighterState(FIGHTERS.find((f) => f.id === "VEX"), WIDTH * 0.3, "mid", true);
    this.cpu = new FighterState(FIGHTERS.find((f) => f.id === "BYTE"), WIDTH * 0.7, "mid", false);

    this.aiProfile = choose(AI_PERSONALITY);
    this.aiDifficulty = "medium";
    this.aiTimer = 0;
    this.aiIntent = this.newIntent();

    this._snapshot = this.createSnapshot();
  }

  newIntent() {
    return {
      left: false,
      right: false,
      up: false,
      down: false,
      hitPressed: false,
      kickPressed: false,
      powerPressed: false,
      guardHeld: false,
      guardTapped: false,
      flickLane: 0,
      jump: false,
      stepPower: false
    };
  }

  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
  }

  startMatch(p1Id = "VEX", p2Id = "BYTE") {
    const p1Base = FIGHTERS.find((f) => f.id === p1Id) || FIGHTERS[0];
    const p2Base = FIGHTERS.find((f) => f.id === p2Id) || FIGHTERS[1];
    const p1Meta = RosterManager.getFighterMeta(p1Id);
    const p2Meta = RosterManager.getFighterMeta(p2Id);
    const p1Data = {
      ...p1Base,
      hp: Math.round(p1Base.hp * p1Meta.stats.hpMul),
      walk: p1Base.walk * p1Meta.stats.walkSpeedMul,
      damage: p1Base.damage * p1Meta.stats.damageMul,
      throw: p1Base.throw * p1Meta.stats.throwMul,
      launcherRecovery: p1Base.launcherRecovery * p1Meta.stats.recoveryMul,
      sweepRecovery: p1Base.sweepRecovery * p1Meta.stats.recoveryMul
    };
    const p2Data = {
      ...p2Base,
      hp: Math.round(p2Base.hp * p2Meta.stats.hpMul),
      walk: p2Base.walk * p2Meta.stats.walkSpeedMul,
      damage: p2Base.damage * p2Meta.stats.damageMul,
      throw: p2Base.throw * p2Meta.stats.throwMul,
      launcherRecovery: p2Base.launcherRecovery * p2Meta.stats.recoveryMul,
      sweepRecovery: p2Base.sweepRecovery * p2Meta.stats.recoveryMul
    };
    this.player = new FighterState(p1Data, WIDTH * 0.3, "mid", true);
    this.cpu = new FighterState(p2Data, WIDTH * 0.7, "mid", false);
    this.round = 1;
    this.roundTimer = this.roundTime;
    this.events.length = 0;
    this.emit("ROUND_START", { round: 1 });
  }

  update(dt, playerIntent, cpuIntentOverride = null) {
    this.events.length = 0;
    if (this.paused) {
      this.timeMs += dt * 1000;
      this._snapshot = this.createSnapshot();
      return this.getSnapshot();
    }
    this.timeMs += dt * 1000;
    this.roundTimer -= dt;

    const p1 = { ...this.newIntent(), ...playerIntent };
    const p2 = cpuIntentOverride || this.buildAIIntent(dt);

    if (this.player.canAct()) this.applyMovement(this.player, p1, dt);
    if (this.cpu.canAct()) this.applyMovement(this.cpu, p2, dt);

    this.resolveIntent(this.player, this.cpu, p1);
    this.resolveIntent(this.cpu, this.player, p2);

    this.tickFighter(this.player, dt);
    this.tickFighter(this.cpu, dt);

    this.resolveActiveHit(this.player, this.cpu);
    this.resolveActiveHit(this.cpu, this.player);

    if (this.roundTimer <= 0) {
      const winner = this.player.hp >= this.cpu.hp ? this.player : this.cpu;
      this.endRound(winner);
    }

    if (this.player.hp <= 0 || this.cpu.hp <= 0) {
      const winner = this.player.hp > this.cpu.hp ? this.player : this.cpu;
      this.endRound(winner);
    }

    this._snapshot = this.createSnapshot();
    return this.getSnapshot();
  }

  applyMovement(f, intent, dt) {
    const walkSpeed = 150 * f.data.walk;
    if (intent.left) f.x -= walkSpeed * dt;
    if (intent.right) f.x += walkSpeed * dt;
    f.x = clamp(f.x, 72, WIDTH - 72);

    if (intent.up) this.shiftLane(f, 1);
    if (intent.down) this.shiftLane(f, -1);
    if (intent.flickLane !== 0) {
      this.shiftLane(f, intent.flickLane);
      f.evadeTimer = 0.11 * f.data.sidestep;
      this.emit("LANE_SHIFT", { actor: f.isPlayer ? "p1" : "p2", lane: f.lane, flick: true });
    }

    f.y += (LANE_Y[f.targetLane] - f.y) * Math.min(1, dt * 20 * f.data.sidestep);
  }

  shiftLane(f, dir) {
    const idx = LANES.indexOf(f.targetLane);
    const next = clamp(idx + dir, 0, LANES.length - 1);
    const before = f.targetLane;
    f.targetLane = LANES[next];
    f.lane = f.targetLane;
    if (before !== f.targetLane) {
      this.emit("LANE_SHIFT", { actor: f.isPlayer ? "p1" : "p2", lane: f.targetLane, flick: false });
    }
  }

  resolveIntent(attacker, defender, intent) {
    if (!attacker.canAct()) return;
    attacker.crouching = intent.down;
    attacker.guarding = intent.guardHeld;
    if (intent.guardTapped) attacker.guardTapTimer = 0.18;
    if (intent.hitPressed || intent.guardTapped) attacker.breakBuffer = 0.16;

    const forward = attacker.side > 0 ? intent.right : intent.left;

    if (intent.hitPressed && intent.powerPressed) return this.startMove(attacker, MOVESETS.throw);
    if (intent.stepPower) return this.startMove(attacker, MOVESETS.sidestepStrike);
    if (intent.down && intent.powerPressed) return this.startMove(attacker, MOVESETS.sweep);
    if (forward && intent.powerPressed) return this.startMove(attacker, MOVESETS.launcher);
    if (intent.down && intent.hitPressed) return this.startMove(attacker, MOVESETS.low);
    if (intent.jump && intent.hitPressed) return this.startMove(attacker, MOVESETS.jumpIn);
    if (intent.powerPressed) return this.startMove(attacker, MOVESETS.heavy);
    if (intent.kickPressed) return this.startMove(attacker, MOVESETS.kick);

    if (intent.hitPressed) {
      if (attacker.comboTimer > 0) this.startMove(attacker, MOVESETS.string2);
      else this.startMove(attacker, MOVESETS.jab);
    }
  }

  startMove(f, baseMove) {
    const m = { ...baseMove };
    m.damage = m.type === "throw" ? Math.round(m.damage * f.data.throw) : Math.round(m.damage * f.data.damage);
    if (m.name === "launcher") m.recovery = Math.round(m.recovery * f.data.launcherRecovery);
    if (m.name === "sweep") m.recovery = Math.round(m.recovery * f.data.sweepRecovery);
    if (m.unsafe) f.lastUnsafe = 0.5;
    f.move = m;
    f.movePhase = "startup";
    f.moveTimer = m.startup;
    f.moveHitDone = false;
  }

  tickFighter(f, dt) {
    if (f.guardTapTimer > 0) f.guardTapTimer -= dt;
    if (f.breakBuffer > 0) f.breakBuffer -= dt;
    if (f.comboTimer > 0) f.comboTimer -= dt;
    if (f.evadeTimer > 0) f.evadeTimer -= dt;
    if (f.hitstun > 0) f.hitstun -= dt * 60;
    if (f.blockstun > 0) f.blockstun -= dt * 60;
    if (f.knockdown > 0) f.knockdown -= dt * 60;
    if (f.launchTimer > 0) f.launchTimer -= dt * 60;
    if (f.armorFrames > 0) f.armorFrames -= dt * 60;
    if (f.lastUnsafe > 0) f.lastUnsafe -= dt;

    if (f.movePhase === "idle") return;
    f.moveTimer -= dt * 60;
    if (f.moveTimer > 0) return;

    if (f.movePhase === "startup") {
      f.movePhase = "active";
      f.moveTimer = f.move.active;
      return;
    }

    if (f.movePhase === "active") {
      f.movePhase = "recovery";
      f.moveTimer = f.move.recovery;
      return;
    }

    f.movePhase = "idle";
    f.move = null;
    f.moveHitDone = false;
  }

  resolveActiveHit(attacker, defender) {
    if (!attacker.move || attacker.movePhase !== "active" || attacker.moveHitDone) return;
    if (!this.canHit(attacker, defender, attacker.move)) return;

    attacker.moveHitDone = true;
    const hitDir = attacker.side || (attacker.x < defender.x ? 1 : -1);
    const counter = defender.movePhase === "startup" || defender.movePhase === "active";
    const punish = defender.lastUnsafe > 0;

    if (attacker.move.type === "throw") {
      if (defender.breakBuffer > 0) {
        defender.blockstun = 8;
      this.emit("THROW_BREAK", {
        actor: defender.isPlayer ? "p1" : "p2",
        attacker: attacker.isPlayer ? "p1" : "p2",
        x: defender.x,
        y: defender.y,
        dir: hitDir
      });
      this.emit("BLOCK", {
        perfect: true,
        actor: defender.isPlayer ? "p1" : "p2",
        attacker: attacker.isPlayer ? "p1" : "p2",
        x: defender.x,
        y: defender.y,
        dir: hitDir,
        attackType: attacker.move.attackType || attacker.move.type || "strike",
        move: attacker.move.name,
        damage: Math.max(1, Math.floor(attacker.move.damage * 0.07)),
        advantageMs: Math.round(((attacker.move.blockstun - attacker.move.recovery) / 60) * 1000)
      });
        return;
      }
      this.applyDamage(defender, attacker.move.damage, attacker, attacker.move, false);
      defender.knockdown = 24;
      this.emit("THROW", { actor: defender.isPlayer ? "p1" : "p2", x: defender.x, y: defender.y, dir: hitDir });
      return;
    }

    const crouch = defender.crouching;
    const blocksHighMid = defender.guarding && !crouch;
    const blocksLow = defender.guarding && crouch;
    const perfect = defender.guardTapTimer > 0.01 && defender.guardTapTimer < 0.15;

    let blocked = false;
    if (attacker.move.hitLevel === "high" || attacker.move.hitLevel === "mid") blocked = blocksHighMid;
    else if (attacker.move.hitLevel === "low") blocked = blocksLow;

    if (blocked) {
      defender.blockstun = perfect ? attacker.move.blockstun * 0.6 : attacker.move.blockstun;
      this.applyDamage(defender, Math.max(1, Math.floor(attacker.move.damage * 0.07)), attacker, attacker.move, true);
      this.emit("BLOCK", {
        perfect,
        actor: defender.isPlayer ? "p1" : "p2",
        attacker: attacker.isPlayer ? "p1" : "p2",
        x: defender.x,
        y: defender.y,
        dir: hitDir,
        attackType: attacker.move.attackType || attacker.move.type || "strike",
        move: attacker.move.name,
        damage: Math.max(1, Math.floor(attacker.move.damage * 0.07)),
        advantageMs: Math.round(((attacker.move.blockstun - attacker.move.recovery) / 60) * 1000)
      });
      return;
    }

    this.applyDamage(defender, attacker.move.damage, attacker, attacker.move, false);
    defender.hitstun = attacker.move.hitstun;
    attacker.comboTimer = 0.24;
    attacker.comboCount += 1;
    attacker.lastHitMove = attacker.move.name;
    if (attacker.comboCount > 1) {
      this.emit("COMBO", { actor: attacker.isPlayer ? "p1" : "p2", count: attacker.comboCount, bonus: attacker.move.damage });
    }

    if (attacker.move.type === "launcher") {
      defender.launchTimer = 26;
      defender.airHits = 0;
    this.emit("LAUNCH", {
      actor: defender.isPlayer ? "p1" : "p2",
      attacker: attacker.isPlayer ? "p1" : "p2",
      x: defender.x,
      y: defender.y,
      dir: hitDir,
      attackType: attacker.move.attackType || attacker.move.type || "strike",
      move: attacker.move.name,
      damage: attacker.move.damage,
      counter,
      punish,
      advantageMs: Math.round(((attacker.move.hitstun - attacker.move.recovery) / 60) * 1000)
    });
    } else if (attacker.move.type === "knockdown") {
      defender.knockdown = 30;
    this.emit("KNOCKDOWN", {
      actor: defender.isPlayer ? "p1" : "p2",
      attacker: attacker.isPlayer ? "p1" : "p2",
      x: defender.x,
      y: defender.y,
      dir: hitDir,
      attackType: attacker.move.attackType || attacker.move.type || "strike",
      move: attacker.move.name,
      damage: attacker.move.damage,
      counter,
      punish,
      advantageMs: Math.round(((attacker.move.hitstun - attacker.move.recovery) / 60) * 1000)
    });
    } else {
    this.emit("HIT", {
      actor: defender.isPlayer ? "p1" : "p2",
      attacker: attacker.isPlayer ? "p1" : "p2",
      move: attacker.move.name,
      x: defender.x,
      y: defender.y,
      dir: hitDir,
      attackType: attacker.move.attackType || attacker.move.type || "strike",
      damage: attacker.move.damage,
      counter,
      punish,
      advantageMs: Math.round(((attacker.move.hitstun - attacker.move.recovery) / 60) * 1000)
    });
    }
  }

  canHit(attacker, defender, move) {
    const facing = attacker.x < defender.x ? 1 : -1;
    attacker.side = facing;
    defender.side = -facing;
    const front = facing > 0 ? defender.x > attacker.x : defender.x < attacker.x;
    if (!front) return false;

    if (Math.abs(defender.x - attacker.x) > move.range) return false;

    const laneDelta = Math.abs(LANES.indexOf(attacker.lane) - LANES.indexOf(defender.lane));
    if (laneDelta > 1) return false;
    if (laneDelta > 0 && !move.tracking) return false;
    if (defender.evadeTimer > 0 && !move.tracking && Math.random() > 0.32) return false;

    return true;
  }

  applyDamage(target, amount, attacker, move, chip) {
    target.hp = clamp(target.hp - amount, 0, target.hpMax);
    if (!chip && target.launchTimer > 0 && move.type !== "launcher") {
      target.airHits += 1;
      if (target.airHits >= 2) {
        target.launchTimer = 0;
        target.knockdown = 20;
      }
    }
  }

  endRound(winner) {
    const loser = winner === this.player ? this.cpu : this.player;
    winner.rounds += 1;
    const isFinalRound = this.player.rounds >= 2 || this.cpu.rounds >= 2;
    this.emit("KO", {
      winner: winner.isPlayer ? "p1" : "p2",
      loser: loser.isPlayer ? "p1" : "p2",
      x: loser.x,
      y: loser.y,
      isFinalRound
    });
    this.pendingRound = {
      isFinalRound,
      winner: winner.isPlayer ? "p1" : "p2",
      p1Name: this.player.data.id,
      p2Name: this.cpu.data.id
    };
    this.paused = true;
  }

  finishPendingRound() {
    if (!this.pendingRound) return this.getSnapshot();
    const { isFinalRound } = this.pendingRound;
    this.events.length = 0;
    if (isFinalRound) {
      this.emit("MATCH_END", { winner: this.player.rounds > this.cpu.rounds ? "p1" : "p2" });
      this.pendingRound = null;
      this.paused = true;
      this._snapshot = this.createSnapshot();
      return this.getSnapshot();
    }

    this.round += 1;
    this.roundTimer = this.roundTime;
    this.player.resetRound(WIDTH * 0.3, "mid");
    this.cpu.resetRound(WIDTH * 0.7, "mid");
    this.emit("ROUND_START", { round: this.round });
    this.pendingRound = null;
    this.paused = false;
    this._snapshot = this.createSnapshot();
    return this.getSnapshot();
  }

  buildAIIntent(dt) {
    this.aiTimer -= dt;
    if (this.aiTimer > 0) return this.aiIntent;

    const diff = DIFFICULTY[this.aiDifficulty];
    this.aiTimer = diff.reactionMs / 1000;
    const dx = this.player.x - this.cpu.x;
    const close = Math.abs(dx) < 86;
    const inRange = Math.abs(dx) < 110;

    const intent = this.newIntent();
    const forward = this.cpu.side > 0 ? "right" : "left";
    const back = this.cpu.side > 0 ? "left" : "right";

    if (Math.random() < diff.blockRate && this.player.movePhase === "active") {
      intent.guardHeld = true;
      if (Math.random() < 0.2) intent.guardTapped = true;
    }

    if (this.aiProfile === "defensive" && this.player.lastUnsafe > 0 && Math.random() < diff.punishRate) {
      intent[forward] = true;
      intent.powerPressed = true;
    } else if (this.aiProfile === "aggressive") {
      if (!close) intent[forward] = true;
      if (inRange && Math.random() > 0.35) intent.hitPressed = true;
      if (inRange && Math.random() > 0.6) intent.kickPressed = true;
      if (inRange && Math.random() > 0.65) intent.powerPressed = true;
    } else {
      if (!close) intent[forward] = true;
      if (Math.random() < diff.sidestepRate) intent.flickLane = Math.random() > 0.5 ? 1 : -1;
      if (inRange && Math.random() > 0.65) {
        intent.down = true;
        intent.hitPressed = true;
      }
      if (inRange && Math.random() > 0.55) intent.kickPressed = true;
      if (close && Math.random() > 0.75) {
        intent.hitPressed = true;
        intent.powerPressed = true;
      }
    }

    if (!intent.hitPressed && !intent.powerPressed && !intent.guardHeld) intent[back] = Math.random() < 0.2;
    this.aiIntent = intent;
    return intent;
  }

  emit(type, data = {}) {
    this.events.push({ type, atMs: this.timeMs, data });
  }

  getSnapshot() {
    return this._snapshot;
  }

  hitboxesFor(f) {
    const forward = f.side;
    const active = f.move && f.movePhase === "active";
    if (!active) return [];
    return [{ x: f.x + forward * 30, y: f.y - 54, w: f.move.range * 0.45, h: 60, owner: f.isPlayer ? "p1" : "p2" }];
  }

  hurtboxesFor(f) {
    return [{ x: f.x - 22, y: f.y - 86, w: 44, h: 86, owner: f.isPlayer ? "p1" : "p2" }];
  }

  visualStateFor(f) {
    if (f.hp <= 0) return "ko";
    if (f.knockdown > 0) return "knockdown";
    if (f.launchTimer > 0) return "launch";
    if (f.hitstun > 0) return "hit";
    if (f.blockstun > 0 || f.guarding) return "block";
    if (f.movePhase !== "idle") {
      if (f.move.attackType === "kick") return "attack_kick";
      if (f.move.attackType === "power") return "attack_power";
      if (f.move.attackType === "hit") return "attack_hit";
      if (f.move.name === "jumpIn") return "jump";
      return "attack_power";
    }
    return "idle";
  }

  createSnapshot() {
    const snapshot = {
      timeMs: this.timeMs,
      roundTimer: this.roundTimer,
      round: this.round,
      paused: this.paused,
      p1: {
        name: this.player.data.id,
        health: this.player.hp,
        maxHealth: this.player.hpMax,
        lane: this.player.lane,
        x: this.player.x,
        y: this.player.y,
        facing: this.player.side,
        state: this.visualStateFor(this.player),
        attackType: this.player.move?.attackType || null,
        comboCount: this.player.comboCount,
        meter: 0,
        isBlocking: this.player.guarding,
        rounds: this.player.rounds,
        color: this.player.data.color,
        accent: this.player.data.accent
      },
      p2: {
        name: this.cpu.data.id,
        health: this.cpu.hp,
        maxHealth: this.cpu.hpMax,
        lane: this.cpu.lane,
        x: this.cpu.x,
        y: this.cpu.y,
        facing: this.cpu.side,
        state: this.visualStateFor(this.cpu),
        attackType: this.cpu.move?.attackType || null,
        comboCount: this.cpu.comboCount,
        meter: 0,
        isBlocking: this.cpu.guarding,
        rounds: this.cpu.rounds,
        color: this.cpu.data.color,
        accent: this.cpu.data.accent
      },
      events: this.events.map((e) => ({ ...e })),
      debug: {
        enabled: this.debugEnabled,
        hitboxes: [...this.hitboxesFor(this.player), ...this.hitboxesFor(this.cpu)],
        hurtboxes: [...this.hurtboxesFor(this.player), ...this.hurtboxesFor(this.cpu)],
        lanes: LANES.map((name) => ({ name, y: LANE_Y[name] }))
      }
    };

    return Object.freeze(snapshot);
  }
}
