import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet';
import { Drone } from '../entities/Drone';
import { Enemy } from '../entities/Enemy';
import { Pickup } from '../entities/Pickup';
import { PlayerShip } from '../entities/Player';
import { ENEMY_BY_ID } from '../data/starlightEnemies';
import { MIDBOSS_CONFIG, PRISM_WARDEN_CONFIG } from '../data/starlightBosses';
import { MISSION_BY_ID } from '../data/starlightMissions';
import { WAVE_BY_ID } from '../data/starlightWaves';
import type { AppliedWeaponConfig, DamageType, EnemyArchetype, EnemyFirePattern, EnemyPathType, MissionDef, SpawnInstruction } from '../data/starlightTypes';
import { applyDamageReduction, resolveDamage } from '../systems/starlightCombat';
import { StarlightHud } from '../systems/starlightHud';
import { resolveLoot } from '../systems/starlightLoot';
import { computeFitting } from '../systems/starlightModuleSystem';
import { StarlightAudio } from '../systems/starlightAudio';
import { MobileInputController } from '../systems/starlightInput';
import { addPortraitHint } from '../systems/starlightUI';
import { WaveDirector } from '../systems/starlightWaveDirector';
import { SCENE_KEYS, SORTIE_TUNING } from '../util/starlightConstants';
import { ObjectPool } from '../util/starlightPool';
import {
  clearPendingResult,
  getSelectedPerk,
  getSave,
  isRunReady,
  isGodMode,
  setPendingResult,
  toggleGodMode,
  updateSave
} from './starlightState';

export class SortieScene extends Phaser.Scene {
  private mission!: MissionDef;
  private player!: PlayerShip;
  private inputController!: MobileInputController;
  private audio!: StarlightAudio;
  private hud!: StarlightHud;
  private fit = computeFitting(getSave(), null);
  private waveDirector: WaveDirector | null = null;

  private bullets!: ObjectPool<Bullet>;
  private enemies!: ObjectPool<Enemy>;
  private pickups!: ObjectPool<Pickup>;
  private drones!: ObjectPool<Drone>;

  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private pickupGroup!: Phaser.Physics.Arcade.Group;

  private starNear!: Phaser.GameObjects.TileSprite;
  private starFar!: Phaser.GameObjects.TileSprite;
  private beamGraphics!: Phaser.GameObjects.Graphics;

  private accumulator = 0;
  private elapsed = 0;
  private primaryCooldown = 0;
  private secondaryCooldown = 0;
  private score = 0;
  private waveDone = false;
  private bossSpawned = false;
  private finalBoss: Enemy | null = null;
  private pausedForPerk = false;
  private missionIntroTimer = 0;
  private finishing = false;

  private devOverlay = false;
  private fpsSmoothed = 60;
  private localInvulnerable = false;

  private bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  constructor() {
    super(SCENE_KEYS.sortie);
  }

  create(): void {
    const missionId = getSave().activeRun?.missionId;
    const debugBypass = false;
    if (!missionId || !isRunReady(debugBypass)) {
      this.scene.start(SCENE_KEYS.perkPick);
      return;
    }
    const mission = MISSION_BY_ID.get(missionId);
    if (!mission) {
      this.scene.start(SCENE_KEYS.missionSelect);
      return;
    }
    this.mission = mission;

    this.cameras.main.setBackgroundColor('#050d18');
    const { width, height } = this.scale;
    this.bounds = {
      minX: SORTIE_TUNING.boundsPaddingX,
      maxX: width - SORTIE_TUNING.boundsPaddingX,
      minY: SORTIE_TUNING.boundsPaddingTop,
      maxY: height - SORTIE_TUNING.boundsPaddingBottom
    };

    this.starFar = this.add.tileSprite(width * 0.5, height * 0.5, width, height, '__WHITE').setTint(0x0c1f39).setAlpha(0.9);
    this.starNear = this.add.tileSprite(width * 0.5, height * 0.5, width, height, '__WHITE').setTint(0x172f4f).setAlpha(0.35);
    this.beamGraphics = this.add.graphics().setDepth(12);

    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group();

    this.bullets = new ObjectPool(() => {
      const bullet = new Bullet(this);
      return bullet;
    }, 220);

    this.enemies = new ObjectPool(() => {
      const enemy = new Enemy(this);
      this.enemyGroup.add(enemy);
      return enemy;
    }, 96);

    this.pickups = new ObjectPool(() => {
      const pickup = new Pickup(this);
      this.pickupGroup.add(pickup);
      return pickup;
    }, 44);

    this.drones = new ObjectPool(() => new Drone(this), 20);

    for (const bullet of this.bullets.all()) {
      if (bullet.fromEnemy) this.enemyBullets.add(bullet);
      else this.playerBullets.add(bullet);
    }

    this.player = new PlayerShip(this, width * 0.5, height - 130);
    this.inputController = new MobileInputController(this, { showSecondaryButton: Boolean(getSave().equippedSlots.secondary) });
    this.audio = new StarlightAudio(this);
    this.hud = new StarlightHud(this);
    this.sound.mute = getSave().settings.mute;

    addPortraitHint(this);
    this.setupCollisions();
    this.bindDebugKeys();
    clearPendingResult();
    this.setupMissionSystems(getSelectedPerk());
  }

  private setupMissionSystems(selectedPerk: ReturnType<typeof getSelectedPerk>): void {
    this.fit = computeFitting(getSave(), selectedPerk);
    this.player.applyLoadout(this.fit.stats);
    const wave = WAVE_BY_ID.get(this.mission.waveId);
    if (!wave) {
      this.scene.start(SCENE_KEYS.missionSelect);
      return;
    }

    this.waveDirector = new WaveDirector(this, wave, ENEMY_BY_ID, {
      spawn: (spawn, index, total, spawnIndex) => {
        const enemy = this.enemies.acquire();
        const archetype = ENEMY_BY_ID.get(spawn.enemyId);
        if (!archetype) return;
        const pos = this.formationPosition(spawn, index, total);
        enemy.spawn(pos.x, pos.y, archetype, index + spawnIndex * 11);
        const hpScale = spawn.hpScale ?? 1;
        enemy.hp *= hpScale;
        enemy.setData('baseHp', enemy.hp);
        enemy.setData('pathType', spawn.pathType ?? 'straight');
        enemy.setData('firePattern', spawn.firePattern ?? 'aimed');
        enemy.setData('spawnIndex', spawnIndex);
        if (spawn.midboss) {
          enemy.setTint(0xffcf7f);
          enemy.setScale(1.5);
          enemy.setData('telegraph', 2.8);
          enemy.setData('weakWindow', 0);
        }
      },
      onWaveEnd: () => {
        this.waveDone = true;
      },
      onMidbossSpawned: () => {
        this.audio.ping(240, 120);
        this.hud.pushPickup('Midboss incoming');
      }
    });

    this.missionIntroTimer = SORTIE_TUNING.missionIntroSeconds;
    this.hud.showIntro(`${this.mission.name}\nThreat ${this.mission.difficulty}`);
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, (a, b) => {
      const bullet = a as Bullet;
      const enemy = b as Enemy;
      if (!bullet.active || !enemy.active || bullet.fromEnemy) return;

      const base = bullet.damage;
      const crit = Math.random() < this.fit.stats.critChance ? 1.5 : 1;
      let dmg = resolveDamage(enemy.enemyId, base * crit, bullet.damageType, 0);
      if (enemy.enemyId === 'midboss') {
        const weakWindow = (enemy.getData('weakWindow') as number | undefined) ?? 0;
        if (weakWindow <= 0) dmg *= 0.35;
      }
      enemy.hp -= dmg;
      bullet.retire();
      if (enemy.hp <= 0) this.killEnemy(enemy);
    });

    this.physics.add.overlap(this.enemyBullets, this.player, (a) => {
      const bullet = a as Bullet;
      if (!bullet.active || !bullet.fromEnemy) return;
      if (!(isGodMode() || this.localInvulnerable)) {
        const reduced = applyDamageReduction(bullet.damage, this.fit.stats.damageReduction);
        this.player.takeDamage(reduced, this.fit.stats.shieldRegenDelay);
      }
      bullet.retire();
      this.audio.ping(120, 70);
    });

    this.physics.add.overlap(this.enemyGroup, this.player, (enemyObj) => {
      const enemy = enemyObj as Enemy;
      if (!enemy.active) return;
      const archetype = ENEMY_BY_ID.get(enemy.enemyId);
      if (!(isGodMode() || this.localInvulnerable)) {
        this.player.takeDamage(archetype?.contactDamage ?? SORTIE_TUNING.enemyContactDamage, this.fit.stats.shieldRegenDelay);
      }
      enemy.retire();
    });

    this.physics.add.overlap(this.pickupGroup, this.player, (pickupObj) => {
      this.consumePickup(pickupObj as Pickup);
    });
  }

  private bindDebugKeys(): void {
    this.input.keyboard?.on('keydown-L', () => {
      const pickup = this.pickups.acquire();
      pickup.spawn(this.player.x + 40, this.player.y - 80, 'credit', '');
    });
    this.input.keyboard?.on('keydown-F6', () => {
      this.spawnMidbossDebug();
    });
    this.input.keyboard?.on('keydown-F7', () => {
      this.waveDone = true;
      this.clearNonBossEnemies();
      if (this.mission.hasFinalBoss && !this.bossSpawned) this.spawnFinalBoss();
    });
    this.input.keyboard?.on('keydown-I', () => {
      this.localInvulnerable = !this.localInvulnerable;
      this.hud.pushPickup(`Invulnerability ${this.localInvulnerable ? 'ON' : 'OFF'}`);
    });
    this.input.keyboard?.on('keydown-G', () => {
      const enabled = toggleGodMode();
      this.hud.pushPickup(`God mode ${enabled ? 'ON' : 'OFF'}`);
    });
    this.input.keyboard?.on('keydown-M', () => {
      const muted = this.audio.toggleMute();
      this.hud.pushPickup(muted ? 'Muted' : 'Audio on');
    });
    this.input.keyboard?.on('keydown-BACKTICK', () => {
      this.devOverlay = !this.devOverlay;
      this.hud.setDevVisible(this.devOverlay);
    });
  }

  update(_time: number, deltaMs: number): void {
    this.fpsSmoothed = Phaser.Math.Linear(this.fpsSmoothed, 1000 / Math.max(1, deltaMs), 0.08);
    this.starFar.tilePositionY -= deltaMs * 0.01;
    this.starNear.tilePositionY -= deltaMs * 0.02;

    if (this.pausedForPerk || this.finishing) return;

    const dtSec = Math.min(0.05, deltaMs / 1000);
    this.accumulator += dtSec;

    while (this.accumulator >= SORTIE_TUNING.fixedDt) {
      this.fixedStep(SORTIE_TUNING.fixedDt);
      this.accumulator -= SORTIE_TUNING.fixedDt;
    }

    this.refreshHud();
  }

  private fixedStep(dt: number): void {
    this.elapsed += dt;
    this.beamGraphics.clear();

    this.waveDirector?.update(dt);
    this.missionIntroTimer = Math.max(0, this.missionIntroTimer - dt);

    const input = this.inputController.snapshot();
    this.player.fixedStep(dt, input.moveX, input.moveY, this.fit.stats, this.bounds);

    if (this.inputController.consumeAbility()) {
      const dirX = Math.abs(input.moveX) > 0.05 ? input.moveX : 0;
      const dirY = Math.abs(input.moveY) > 0.05 ? input.moveY : -1;
      if (this.player.tryBlink(dirX, dirY, this.fit.stats, this.bounds)) this.audio.ping(520, 80);
    }

    this.primaryCooldown -= dt;
    this.secondaryCooldown -= dt;

    const overheatPenalty = this.player.overheat ? Math.max(0.2, 1 - this.fit.stats.overheatFirePenalty) : 1;
    if (input.firing && this.primaryCooldown <= 0) {
      this.fireWeapon(this.fit.primaryWeapon, true);
      this.primaryCooldown = 1 / Math.max(1, this.fit.primaryWeapon.fireRate * overheatPenalty);
    }

    if (this.fit.slots.secondary && this.inputController.consumeSecondary() && this.secondaryCooldown <= 0) {
      this.fireWeapon(this.fit.secondaryWeapon, false);
      this.secondaryCooldown = 1 / Math.max(0.4, this.fit.secondaryWeapon.fireRate * overheatPenalty);
    }

    this.updateEnemies(dt);
    this.updateDrones(dt);
    this.pullPickups(dt);
    this.cullInactive();
    this.handleWaveCompletion();

    if (this.player.hull <= 0 && !this.finishing) {
      this.finishRun(false);
    }
  }

  private fireWeapon(weapon: AppliedWeaponConfig, primary: boolean): void {
    const originX = this.player.x;
    const originY = this.player.y - 20;
    const count = weapon.pattern === 'scatter' ? Math.max(3, weapon.burstCount) : weapon.burstCount;

    for (let i = 0; i < count; i += 1) {
      const spreadFactor = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
      const angle = Phaser.Math.DegToRad(weapon.spreadDeg * spreadFactor - 90);
      const vx = Math.cos(angle) * weapon.projectileSpeed;
      const vy = Math.sin(angle) * weapon.projectileSpeed;
      const bullet = this.bullets.acquire();
      bullet.fromEnemy = false;
      this.playerBullets.add(bullet);
      bullet.setTint(primary ? 0xa7eaff : 0xffd499);
      bullet.fire(originX + spreadFactor * 16, originY, vx, vy, weapon.damage, false, weapon.damageType);
    }

    this.player.heat += weapon.heatPerShot;
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies.all()) {
      if (!enemy.active) continue;
      const archetype = ENEMY_BY_ID.get(enemy.enemyId);
      if (!archetype) continue;

      enemy.fireTimer += dt;

      if (enemy.enemyId === 'prism-warden') {
        this.updatePrismWarden(enemy, dt);
      } else if (enemy.enemyId === 'midboss') {
        this.updateMidboss(enemy, dt);
      } else {
        this.applyEnemyPath(enemy, archetype.speed, dt, enemy.getData('pathType') as EnemyPathType | undefined);
        this.maybeEnemyFire(enemy, archetype, enemy.getData('firePattern') as EnemyFirePattern | undefined);
      }
    }
  }

  private updateMidboss(enemy: Enemy, dt: number): void {
    this.applyEnemyPath(enemy, 35, dt, 'sine');

    let telegraph = (enemy.getData('telegraph') as number | undefined) ?? 2.4;
    let weakWindow = (enemy.getData('weakWindow') as number | undefined) ?? 0;
    telegraph -= dt;
    weakWindow -= dt;

    if (telegraph <= 0) {
      for (let i = -2; i <= 2; i += 1) {
        const angle = Phaser.Math.DegToRad(-90 + i * MIDBOSS_CONFIG.spreadStepDeg);
        const bullet = this.bullets.acquire();
        bullet.fromEnemy = true;
        this.enemyBullets.add(bullet);
        bullet.fire(enemy.x, enemy.y + 16, Math.cos(angle) * 170, Math.sin(angle) * 170, MIDBOSS_CONFIG.volleyDamage, true, 'EM');
      }
      weakWindow = MIDBOSS_CONFIG.weakWindowSec;
      telegraph = MIDBOSS_CONFIG.telegraphSec;
      this.hud.pushPickup('Midboss weak point exposed');
    }

    if (weakWindow > 0) {
      enemy.setTint(0xa7ff9b);
    } else {
      enemy.setTint(0xffcf7f);
    }

    const gAlpha = Phaser.Math.Clamp(telegraph, 0, 1) * 0.55;
    this.beamGraphics.lineStyle(4, 0xffdd9e, gAlpha);
    this.beamGraphics.strokeCircle(enemy.x, enemy.y, 46);

    enemy.setData('telegraph', telegraph);
    enemy.setData('weakWindow', weakWindow);
  }

  private updatePrismWarden(boss: Enemy, dt: number): void {
    const maxHp = (boss.getData('baseHp') as number | undefined) ?? boss.hp;
    const hpPct = boss.hp / Math.max(1, maxHp);
    const phaseIndex = PRISM_WARDEN_CONFIG.phases.findIndex((phase) => hpPct > phase.hpAbove);
    const phase = PRISM_WARDEN_CONFIG.phases[Math.max(0, phaseIndex)];
    if (!phase) return;

    let beamAngle = (boss.getData('beamAngle') as number | undefined) ?? -Math.PI * 0.8;
    let beamTelegraph = (boss.getData('beamTelegraph') as number | undefined) ?? 2;
    let beamActive = (boss.getData('beamActive') as number | undefined) ?? 0;
    let droneSpawnTimer = (boss.getData('droneSpawnTimer') as number | undefined) ?? 3;
    let volleyTimer = (boss.getData('volleyTimer') as number | undefined) ?? 1.8;
    let chargeTimer = (boss.getData('chargeTimer') as number | undefined) ?? 5;

    boss.setVelocityX(Math.sin(this.elapsed * 0.7 + phase.beamSweepSpeed) * 80);
    boss.setVelocityY(10);

    beamTelegraph -= dt;
    beamActive -= dt;

    if (beamTelegraph <= 0 && beamActive <= 0) {
      beamActive = phase.beamDurationSec;
      beamTelegraph = phase.beamTelegraphSec;
      beamAngle = -Math.PI * 0.78;
      this.hud.pushPickup('Prism beam sweep');
    }

    if (beamActive > 0) {
      beamAngle += dt * phase.beamSweepSpeed;
      this.drawBeamAndDamage(boss.x, boss.y, beamAngle, 430, 0xff8ca8, 0.72, 1.2 + phase.volleyDamage * 0.08);
    } else if (beamTelegraph < 1) {
      this.drawBeamAndDamage(boss.x, boss.y, beamAngle, 430, 0xfff3a8, 0.25, 0, true);
    }

    droneSpawnTimer -= dt;
    if (droneSpawnTimer <= 0) {
      droneSpawnTimer = phase.droneSpawnSec;
      for (let i = 0; i < phase.droneCount; i += 1) {
        const angle = (Math.PI * 2 * i) / phase.droneCount;
        const drone = this.drones.acquire();
        drone.spawn(boss.x + Math.cos(angle) * 46, boss.y + Math.sin(angle) * 46, 'prism-warden', angle);
        drone.setData('breakDelay', 2.8 - phase.volleyCount * 0.03);
      }
    }

    chargeTimer -= dt;
    if (chargeTimer <= 0) {
      chargeTimer = phase.chargeCadenceSec;
      volleyTimer = 0.28;
      boss.setTint(0xffa9ff);
    }

    volleyTimer -= dt;
    if (volleyTimer <= 0) {
      boss.setTint(0xb3f5ff);
      volleyTimer = Math.max(1.4, phase.chargeCadenceSec - 1.9);
      for (let i = 0; i < phase.volleyCount; i += 1) {
        const spread = (i / Math.max(1, phase.volleyCount - 1) - 0.5) * (phase.volleyCount >= 9 ? 1.5 : 1.1);
        const angle = -Math.PI / 2 + spread;
        const bullet = this.bullets.acquire();
        bullet.fromEnemy = true;
        this.enemyBullets.add(bullet);
        bullet.setTint(0xff95ef);
        bullet.fire(boss.x, boss.y + 24, Math.cos(angle) * 220, Math.sin(angle) * 220, phase.volleyDamage, true, 'Plasma');
      }
    }

    boss.setData('beamAngle', beamAngle);
    boss.setData('beamTelegraph', beamTelegraph);
    boss.setData('beamActive', beamActive);
    boss.setData('droneSpawnTimer', droneSpawnTimer);
    boss.setData('volleyTimer', volleyTimer);
    boss.setData('chargeTimer', chargeTimer);
  }

  private drawBeamAndDamage(x: number, y: number, angle: number, length: number, color: number, alpha: number, damage: number, telegraphOnly = false): void {
    const reduced = getSave().settings.reducedEffects;
    this.beamGraphics.lineStyle(reduced ? 4 : 7, color, reduced ? alpha * 0.65 : alpha);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(x, y);
    this.beamGraphics.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    this.beamGraphics.strokePath();

    if (telegraphOnly || isGodMode() || this.localInvulnerable) return;
    const px = this.player.x - x;
    const py = this.player.y - y;
    const dist = Math.hypot(px, py);
    if (dist > length + 20) return;
    const dirAngle = Math.atan2(py, px);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(dirAngle - angle));
    if (diff < 0.18) {
      this.player.takeDamage(applyDamageReduction(damage, this.fit.stats.damageReduction), this.fit.stats.shieldRegenDelay);
    }
  }

  private updateDrones(dt: number): void {
    const boss = this.finalBoss;
    for (const drone of this.drones.all()) {
      if (!drone.active) continue;

      let breakDelay = (drone.getData('breakDelay') as number | undefined) ?? 2.6;
      breakDelay -= dt;
      drone.setData('breakDelay', breakDelay);

      if (!boss || !boss.active || breakDelay <= 0) {
        if (breakDelay <= 0) {
          drone.setVelocity(Math.cos(drone.orbitAngle) * 120, 130 + Math.sin(drone.orbitAngle) * 45);
          if (Math.floor((this.elapsed + drone.orbitAngle) * 8) % 7 === 0) {
            this.fireEnemyPattern(drone.x, drone.y, 'spread3', 'Kinetic', 170, 7);
          }
        }
      } else {
        drone.orbitAngle += dt * 1.9;
        const radius = 56;
        drone.setPosition(boss.x + Math.cos(drone.orbitAngle) * radius, boss.y + Math.sin(drone.orbitAngle) * radius);
      }

      if (drone.y > this.scale.height + 70) drone.retire();
    }
  }

  private maybeEnemyFire(enemy: Enemy, archetype: EnemyArchetype, pattern: EnemyFirePattern | undefined): void {
    if (pattern === 'none') return;
    const interval = Math.max(0.28, 1 / Math.max(0.5, archetype.fireRate));
    if (enemy.fireTimer < interval) return;
    enemy.fireTimer = 0;
    this.fireEnemyPattern(enemy.x, enemy.y + 8, pattern ?? 'aimed', archetype.damageType, archetype.bulletSpeed, archetype.id === 'sniper' ? 14 : 9);
  }

  private fireEnemyPattern(x: number, y: number, pattern: EnemyFirePattern, type: DamageType, speed: number, damage: number): void {
    if (pattern === 'aimed') {
      this.fireEnemyShot(x, y, type, speed, damage, 0);
      return;
    }
    if (pattern === 'spread3') {
      this.fireEnemyShot(x, y, type, speed, damage, -0.24);
      this.fireEnemyShot(x, y, type, speed, damage, 0);
      this.fireEnemyShot(x, y, type, speed, damage, 0.24);
      return;
    }
    for (let i = -2; i <= 2; i += 1) {
      this.fireEnemyShot(x, y, type, speed, damage, i * 0.14);
    }
  }

  private fireEnemyShot(x: number, y: number, type: DamageType, speed: number, damage: number, angleOffset: number): void {
    const bullet = this.bullets.acquire();
    bullet.fromEnemy = true;
    this.enemyBullets.add(bullet);

    const dx = this.player.x - x;
    const dy = this.player.y - y;
    const baseAngle = Math.atan2(dy, dx) + angleOffset;
    bullet.setTint(0xff8ea7);
    bullet.fire(x, y, Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed, damage, true, type);
  }

  private applyEnemyPath(enemy: Enemy, speed: number, _dt: number, path: EnemyPathType | undefined): void {
    const pathType = path ?? 'straight';
    const osc = Math.sin((this.elapsed + enemy.movementSeed) * 2);

    if (pathType === 'sine') {
      enemy.setVelocityX(osc * 100);
      enemy.setVelocityY(speed);
      return;
    }
    if (pathType === 'zigzag') {
      const dir = Math.sin((this.elapsed + enemy.movementSeed) * 4.2) > 0 ? 1 : -1;
      enemy.setVelocityX(dir * 110);
      enemy.setVelocityY(speed * 0.9);
      return;
    }
    if (pathType === 'dive') {
      const extra = enemy.y > 230 ? 120 : 0;
      enemy.setVelocityX(osc * 52);
      enemy.setVelocityY(speed + extra);
      return;
    }

    enemy.setVelocityX(osc * 48);
    enemy.setVelocityY(speed);
  }

  private consumePickup(pickup: Pickup): void {
    if (!pickup.active) return;
    const save = getSave();
    if (pickup.kind === 'credit') {
      updateSave({
        ...save,
        credits: save.credits + SORTIE_TUNING.pickupCreditValue,
        activeRun: save.activeRun
          ? { ...save.activeRun, earnedCredits: save.activeRun.earnedCredits + SORTIE_TUNING.pickupCreditValue }
          : null
      });
      this.hud.pushPickup(`+${SORTIE_TUNING.pickupCreditValue} credits`);
    } else if (!save.inventory.includes(pickup.payload)) {
      updateSave({
        ...save,
        inventory: [...save.inventory, pickup.payload],
        activeRun: save.activeRun ? { ...save.activeRun, earnedLoot: [...save.activeRun.earnedLoot, pickup.payload] } : null
      });
      this.hud.pushPickup(`module ${pickup.payload}`);
    } else {
      updateSave({
        ...save,
        credits: save.credits + SORTIE_TUNING.pickupDuplicateValue,
        activeRun: save.activeRun
          ? { ...save.activeRun, earnedCredits: save.activeRun.earnedCredits + SORTIE_TUNING.pickupDuplicateValue }
          : null
      });
      this.hud.pushPickup(`duplicate salvaged +${SORTIE_TUNING.pickupDuplicateValue}`);
    }
    pickup.retire();
  }

  private pullPickups(dt: number): void {
    for (const pickup of this.pickups.all()) {
      if (!pickup.active) continue;
      const dx = this.player.x - pickup.x;
      const dy = this.player.y - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.fit.stats.lootMagnet) {
        const s = (180 + this.fit.stats.lootMagnet) * dt;
        pickup.x += (dx / Math.max(1, dist)) * s;
        pickup.y += (dy / Math.max(1, dist)) * s;
      }
    }
  }

  private killEnemy(enemy: Enemy): void {
    this.score += enemy.scoreValue;
    const dropChance = enemy.enemyId === 'midboss' ? 1 : enemy.enemyId === 'prism-warden' ? 1 : 0.24;
    if (Math.random() < dropChance) {
      const pickup = this.pickups.acquire();
      pickup.spawn(enemy.x, enemy.y, 'credit', '');
    }

    if (enemy.enemyId === 'prism-warden') {
      this.finishRun(true);
      return;
    }

    enemy.retire();
  }

  private clearNonBossEnemies(): void {
    for (const enemy of this.enemies.all()) {
      if (!enemy.active) continue;
      if (enemy.enemyId === 'prism-warden') continue;
      enemy.retire();
    }
  }

  private handleWaveCompletion(): void {
    if (!this.waveDone) return;

    const hasActiveNonBoss = this.enemies.all().some((enemy) => enemy.active && enemy.enemyId !== 'prism-warden');
    if (hasActiveNonBoss) return;

    if (this.mission.hasFinalBoss) {
      if (!this.bossSpawned) this.spawnFinalBoss();
      return;
    }

    this.finishRun(true);
  }

  private spawnMidbossDebug(): void {
    const existing = this.enemies.all().some((e) => e.active && e.enemyId === 'midboss');
    if (existing) return;
    const boss = this.enemies.acquire();
    const archetype = ENEMY_BY_ID.get('midboss');
    if (!archetype) return;
    boss.spawn(this.scale.width * 0.5, 130, archetype, 0);
    boss.hp *= 1.1;
    boss.setData('baseHp', boss.hp);
    boss.setData('telegraph', 2.8);
    boss.setData('weakWindow', 0);
    boss.setTint(0xffcf7f);
    boss.setScale(1.5);
  }

  private spawnFinalBoss(): void {
    this.bossSpawned = true;
    const boss = this.enemies.acquire();
    const archetype = ENEMY_BY_ID.get('prism-warden') as EnemyArchetype;
    boss.spawn(this.scale.width * 0.5, 120, archetype, 0);
    boss.setData('baseHp', boss.hp);
    boss.setData('beamAngle', -Math.PI * 0.75);
    boss.setData('beamTelegraph', 2.2);
    boss.setData('beamActive', 0);
    boss.setData('droneSpawnTimer', 3.1);
    boss.setData('volleyTimer', 1.8);
    boss.setData('chargeTimer', 4.8);
    boss.setScale(1.75, 1.3);
    this.finalBoss = boss;
    this.hud.showBossBar(true);
    this.hud.pushPickup('Prism Warden engaged');
    this.audio.ping(180, 180);
  }

  private cullInactive(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    for (const bullet of this.bullets.all()) {
      if (!bullet.active) continue;
      if (bullet.x < -30 || bullet.x > width + 30 || bullet.y < -30 || bullet.y > height + 30) bullet.retire();
    }

    for (const enemy of this.enemies.all()) {
      if (!enemy.active) continue;
      if (enemy.y > height + 80) enemy.retire();
    }

    for (const pickup of this.pickups.all()) {
      if (!pickup.active) continue;
      if (pickup.y > height + 40) pickup.retire();
    }
  }

  private refreshHud(): void {
    const bossHp = this.finalBoss?.active ? this.finalBoss.hp : undefined;
    const bossMaxHp = this.finalBoss?.active ? ((this.finalBoss.getData('baseHp') as number | undefined) ?? undefined) : undefined;

    this.hud.updateMeters({
      hull: this.player.hull,
      maxHull: this.fit.stats.maxHull,
      shield: this.player.shield,
      maxShield: this.fit.stats.maxShield,
      heat: this.player.heat,
      heatCap: this.fit.stats.heatCapacity,
      blinkCd: Math.max(0, this.player.blinkCd),
      secondaryCd: Math.max(0, this.secondaryCooldown),
      score: this.score,
      overheat: this.player.overheat,
      bossHp,
      bossMaxHp,
      missionName: this.mission.name
    });

    this.hud.updateDev([
      `FPS ${this.fpsSmoothed.toFixed(1)}`,
      `Bullets ${this.bullets.all().filter((b) => b.active).length}`,
      `Enemies ${this.enemies.all().filter((e) => e.active).length}`,
      `Wave ${(this.waveDirector?.getSpawnIndex() ?? 0)}/${this.waveDirector?.getSpawnCount() ?? 0}`,
      `Invuln ${this.localInvulnerable || isGodMode() ? 'ON' : 'OFF'}`
    ]);
  }

  private finishRun(won: boolean): void {
    if (this.finishing) return;
    this.finishing = true;

    const result = resolveLoot(getSave(), this.mission, won, this.score, this.fit.stats.lootBonus);
    const save = getSave();
    if (save.activeRun) {
      updateSave({
        ...save,
        activeRun: {
          ...save.activeRun,
          earnedCredits: save.activeRun.earnedCredits + result.credits,
          earnedLoot: [...save.activeRun.earnedLoot, ...result.modules],
          defeated: !won
        }
      });
    }
    setPendingResult(result);

    const title = won ? 'Mission Complete' : 'Sortie Lost';
    const body = `Score ${result.score}\nCredits +${result.credits}\nSalvage +${result.salvage}\nModules ${result.modules.length ? result.modules.join(', ') : 'none'}`;
    this.hud.showOverlay(title, body);

    this.time.delayedCall(won ? 1400 : 1700, () => {
      this.scene.start(SCENE_KEYS.results);
    });
  }

  private formationPosition(spawn: SpawnInstruction, index: number, total: number): Phaser.Math.Vector2 {
    const top = -22;
    const span = this.scale.width * 0.76;
    const start = this.scale.width * 0.5 - span * 0.5;

    switch (spawn.formation) {
      case 'line':
        return new Phaser.Math.Vector2(start + (span * index) / Math.max(1, total - 1), top - (index % 2) * 16);
      case 'v':
        return new Phaser.Math.Vector2(this.scale.width * 0.5 + (index - (total - 1) * 0.5) * 52, top - Math.abs(index - (total - 1) * 0.5) * 20);
      case 'circle': {
        const angle = (Math.PI * 2 * index) / Math.max(1, total);
        return new Phaser.Math.Vector2(this.scale.width * 0.5 + Math.cos(angle) * 165, top - 140 + Math.sin(angle) * 85);
      }
      case 'staggered':
      default:
        return new Phaser.Math.Vector2(start + (span * index) / Math.max(1, total - 1), top - (index % 2 === 0 ? 8 : 48));
    }
  }
}
