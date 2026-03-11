import Phaser from 'phaser';

export class Drone extends Phaser.Physics.Arcade.Sprite {
  public orbitAngle = 0;
  public hostId = '';

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'drone');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setDepth(7);
    this.setSize(18, 18);
  }

  spawn(x: number, y: number, hostId: string, angle: number): void {
    this.setPosition(x, y);
    this.hostId = hostId;
    this.orbitAngle = angle;
    this.setActive(true).setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
  }

  retire(): void {
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setPosition(-100, -100);
    this.setVelocity(0, 0);
  }
}
