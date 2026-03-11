import Phaser from 'phaser';
import type { DamageType } from '../data/starlightTypes';

export class Bullet extends Phaser.Physics.Arcade.Image {
  public damage = 1;
  public fromEnemy = false;
  public damageType: DamageType = 'Kinetic';

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(4);
    this.setActive(false).setVisible(false);
    this.setDepth(5);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }

  fire(x: number, y: number, vx: number, vy: number, damage: number, fromEnemy: boolean, damageType: DamageType): void {
    this.setPosition(x, y);
    this.damage = damage;
    this.fromEnemy = fromEnemy;
    this.damageType = damageType;
    this.setActive(true).setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.setVelocity(vx, vy);
  }

  retire(): void {
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setVelocity(0, 0);
    this.setPosition(-100, -100);
  }
}
