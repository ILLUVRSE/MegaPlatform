import Phaser from 'phaser';

export function ensureBallTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('homerun-ball')) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(12, 12, 10);
  g.lineStyle(2, 0xe8e8e8, 0.8);
  g.strokeCircle(12, 12, 10);
  g.lineStyle(1.5, 0xd35151, 0.9);
  g.beginPath();
  g.arc(9, 10, 6, -0.4, 1.6);
  g.strokePath();
  g.beginPath();
  g.arc(15, 14, 6, 2.7, 4.6);
  g.strokePath();
  g.generateTexture('homerun-ball', 24, 24);
  g.destroy();
}

export function ensureBatTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('homerun-bat')) return;
  const g = scene.add.graphics();
  g.fillStyle(0x6f4a2c, 1);
  g.fillRoundedRect(4, 8, 40, 8, 4);
  g.fillStyle(0x8a623f, 1);
  g.fillRoundedRect(30, 6, 22, 12, 6);
  g.lineStyle(1, 0xf3e4c4, 0.6);
  g.strokeRoundedRect(30, 6, 22, 12, 6);
  g.generateTexture('homerun-bat', 60, 24);
  g.destroy();
}
