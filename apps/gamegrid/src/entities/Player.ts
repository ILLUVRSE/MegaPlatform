import Phaser from 'phaser';
import type { ShipStats } from '../data/starlightTypes';
import { clamp } from '../util/starlightMath';

export class PlayerShip extends Phaser.Physics.Arcade.Sprite {
  public hull = 1;
  public shield = 1;
  public heat = 0;
  public invuln = 0;
  public blinkCd = 0;
  public overheat = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setDamping(true);
    this.setDrag(0.9);
    this.setSize(34, 34);
  }

  applyLoadout(stats: ShipStats): void {
    this.hull = stats.maxHull;
    this.shield = stats.maxShield;
    this.heat = 0;
  }

  fixedStep(dtSec: number, inputX: number, inputY: number, stats: ShipStats, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    const hasInput = Math.abs(inputX) > 0.01 || Math.abs(inputY) > 0.01;
    const accel = stats.accel;
    body.velocity.x += inputX * accel * dtSec;
    body.velocity.y += inputY * accel * dtSec;

    const damping = hasInput ? stats.damping : Math.min(0.86, stats.damping + stats.idleDampingBoost);
    body.velocity.x *= 1 - damping * dtSec;
    body.velocity.y *= 1 - damping * dtSec;

    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed > stats.maxSpeed) {
      const scale = stats.maxSpeed / speed;
      body.velocity.x *= scale;
      body.velocity.y *= scale;
    }

    const softStrength = 10;
    if (this.x < bounds.minX) body.velocity.x += (bounds.minX - this.x) * softStrength * dtSec;
    if (this.x > bounds.maxX) body.velocity.x -= (this.x - bounds.maxX) * softStrength * dtSec;
    if (this.y < bounds.minY) body.velocity.y += (bounds.minY - this.y) * softStrength * dtSec;
    if (this.y > bounds.maxY) body.velocity.y -= (this.y - bounds.maxY) * softStrength * dtSec;
    this.x = clamp(this.x, bounds.minX - 10, bounds.maxX + 10);
    this.y = clamp(this.y, bounds.minY - 10, bounds.maxY + 10);

    if (speed > 12) {
      const target = Math.atan2(body.velocity.y, body.velocity.x) + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, target, stats.turnRate * dtSec);
    }

    this.blinkCd = Math.max(0, this.blinkCd - dtSec);
    this.invuln = Math.max(0, this.invuln - dtSec);
    this.heat = Math.max(0, this.heat - stats.heatDissipation * dtSec);
    this.overheat = this.heat > stats.heatCapacity;

    if (this.overheat && this.heat < stats.heatCapacity * 0.65) {
      this.overheat = false;
    }

    const shieldDelay = (this.getData('shieldDelay') as number | undefined) ?? 0;
    if (shieldDelay <= 0) {
      this.shield = Math.min(stats.maxShield, this.shield + stats.shieldRegen * dtSec);
    } else {
      this.setData('shieldDelay', shieldDelay - dtSec);
    }
  }

  tryBlink(dirX: number, dirY: number, stats: ShipStats, bounds: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
    if (this.blinkCd > 0) return false;
    const len = Math.max(0.001, Math.hypot(dirX, dirY));
    const dx = (dirX / len) * stats.blinkDistance;
    const dy = (dirY / len) * stats.blinkDistance;
    this.x = clamp(this.x + dx, bounds.minX, bounds.maxX);
    this.y = clamp(this.y + dy, bounds.minY, bounds.maxY);
    this.blinkCd = stats.blinkCooldown;
    this.invuln = 0.45;
    return true;
  }

  takeDamage(amount: number, shieldRegenDelay: number): void {
    if (this.invuln > 0) return;
    let pending = amount;
    if (this.shield > 0) {
      const shieldAbsorb = Math.min(this.shield, pending);
      this.shield -= shieldAbsorb;
      pending -= shieldAbsorb;
    }
    if (pending > 0) {
      this.hull = Math.max(0, this.hull - pending);
    }
    this.setData('shieldDelay', shieldRegenDelay);
    this.invuln = 0.08;
  }
}
