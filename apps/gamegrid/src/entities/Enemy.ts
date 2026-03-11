import Phaser from 'phaser';
import type { EnemyArchetype } from '../data/starlightTypes';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public enemyId = 'scout';
  public hp = 1;
  public fireTimer = 0;
  public scoreValue = 0;
  public movementSeed = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setDepth(6);
    this.setSize(32, 32);
  }

  spawn(x: number, y: number, archetype: EnemyArchetype, seed: number): void {
    this.setPosition(x, y);
    this.enemyId = archetype.id;
    this.hp = archetype.hp;
    this.fireTimer = 0;
    this.scoreValue = archetype.score;
    this.movementSeed = seed;
    this.setActive(true).setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.setVelocity(0, archetype.speed);
    this.setTint(archetype.id === 'midboss' ? 0xffba5f : archetype.id === 'prism-warden' ? 0xb3f5ff : 0xff6f7d);
  }

  retire(): void {
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setVelocity(0, 0);
    this.setPosition(-100, -100);
  }
}
