import Phaser from 'phaser';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  public kind: 'credit' | 'module' = 'credit';
  public payload = '';

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'pickup');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(10);
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setDepth(8);
  }

  spawn(x: number, y: number, kind: 'credit' | 'module', payload: string): void {
    this.kind = kind;
    this.payload = payload;
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.setVelocity(0, 90);
    this.setTint(kind === 'credit' ? 0xffe57a : 0x8dffcb);
  }

  retire(): void {
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setVelocity(0, 0);
    this.setPosition(-100, -100);
  }
}
