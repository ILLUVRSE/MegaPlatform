import Phaser from 'phaser';

const FIELD_WIDTH = 1280;
const FIELD_HEIGHT = 720;

export interface FieldArt {
  vignette: Phaser.GameObjects.Image;
  scoreboard: Phaser.GameObjects.Rectangle;
  crowd: Phaser.GameObjects.Graphics;
  fence: Phaser.GameObjects.Graphics;
}

function createVignette(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35);
  g.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  g.generateTexture('homerun-vignette', FIELD_WIDTH, FIELD_HEIGHT);
  g.destroy();
  return scene.add.image(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 'homerun-vignette').setAlpha(0.4).setBlendMode(Phaser.BlendModes.MULTIPLY);
}

export function buildFieldArt(scene: Phaser.Scene): FieldArt {
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x06131f, 0x06131f, 0x133554, 0x133554, 1);
  bg.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  const horizon = scene.add.graphics();
  horizon.fillGradientStyle(0x163750, 0x163750, 0x0d263a, 0x0d263a, 1);
  horizon.fillRect(0, 80, FIELD_WIDTH, 300);

  const field = scene.add.graphics();
  field.fillStyle(0x1c5f36, 1);
  field.fillRect(0, 360, FIELD_WIDTH, 360);
  field.fillStyle(0x2b7a45, 0.9);
  for (let i = 0; i < 8; i += 1) {
    field.fillRect(0, 360 + i * 42, FIELD_WIDTH, 20);
  }

  const dirt = scene.add.graphics();
  dirt.fillStyle(0xcaa472, 1);
  dirt.fillCircle(640, 620, 140);
  dirt.fillStyle(0xd7b98c, 1);
  dirt.fillTriangle(640, 600, 540, 720, 740, 720);

  const lines = scene.add.graphics();
  lines.lineStyle(3, 0xfef2d0, 0.8);
  lines.beginPath();
  lines.moveTo(640, 600);
  lines.lineTo(420, 720);
  lines.moveTo(640, 600);
  lines.lineTo(860, 720);
  lines.strokePath();

  lines.lineStyle(2, 0xffffff, 0.9);
  lines.strokeRect(620, 606, 40, 24);

  const fence = scene.add.graphics();
  fence.lineStyle(6, 0xd7e4ff, 0.7);
  fence.strokeEllipse(640, 170, 900, 280);
  fence.lineStyle(2, 0x8fb3d9, 0.6);
  fence.strokeEllipse(640, 170, 930, 300);

  const crowd = scene.add.graphics();
  crowd.fillStyle(0x0b1b2a, 0.9);
  const crowdBaseY = 150;
  for (let x = 0; x < FIELD_WIDTH; x += 20) {
    const height = 18 + Math.floor(Math.random() * 18);
    crowd.fillRect(x, crowdBaseY - height, 16, height);
  }

  const scoreboard = scene.add.rectangle(640, 94, 220, 54, 0x0f2436, 0.85).setStrokeStyle(2, 0x4c6a8a, 0.9);

  const vignette = createVignette(scene);

  bg.setDepth(0);
  horizon.setDepth(1);
  crowd.setDepth(2);
  fence.setDepth(3);
  field.setDepth(4);
  dirt.setDepth(5);
  lines.setDepth(6);
  scoreboard.setDepth(8);
  vignette.setDepth(40);

  return {
    vignette,
    scoreboard,
    crowd,
    fence
  };
}
