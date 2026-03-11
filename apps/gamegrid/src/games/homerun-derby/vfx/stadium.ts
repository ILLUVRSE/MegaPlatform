import Phaser from 'phaser';

const FIELD_WIDTH = 1280;
const FIELD_HEIGHT = 720;

export interface StadiumArt {
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
  return scene.add.image(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 'homerun-vignette').setAlpha(0.45).setBlendMode(Phaser.BlendModes.MULTIPLY);
}

export function buildStadiumArt(scene: Phaser.Scene): StadiumArt {
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x06131f, 0x06131f, 0x173b58, 0x173b58, 1);
  bg.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  const haze = scene.add.graphics();
  haze.fillGradientStyle(0x1b3c55, 0x1b3c55, 0x0b1c2a, 0x0b1c2a, 1);
  haze.fillRect(0, 70, FIELD_WIDTH, 260);

  const field = scene.add.graphics();
  field.fillGradientStyle(0x15472a, 0x15472a, 0x1e6a3a, 0x1e6a3a, 1);
  field.fillRect(0, 330, FIELD_WIDTH, 390);

  const stripes = scene.add.graphics();
  stripes.fillStyle(0x1f6a39, 0.6);
  for (let i = 0; i < 8; i += 1) {
    stripes.fillRect(0, 340 + i * 48, FIELD_WIDTH, 24);
  }

  const dirt = scene.add.graphics();
  dirt.fillStyle(0xcaa472, 1);
  dirt.fillCircle(640, 620, 140);
  dirt.fillStyle(0xd7b98c, 1);
  dirt.fillTriangle(640, 600, 520, 720, 760, 720);

  const fairShade = scene.add.graphics();
  fairShade.fillStyle(0x1e6a3a, 0.35);
  fairShade.fillTriangle(640, 360, 240, 720, 1040, 720);

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
  fence.lineStyle(6, 0xbfd4ee, 0.85);
  const fenceY = 190;
  const fenceLeft = 260;
  const fenceRight = 1020;
  fence.strokeLineShape(new Phaser.Geom.Line(fenceLeft, fenceY + 40, 500, fenceY));
  fence.strokeLineShape(new Phaser.Geom.Line(500, fenceY, 780, fenceY));
  fence.strokeLineShape(new Phaser.Geom.Line(780, fenceY, fenceRight, fenceY + 40));
  fence.lineStyle(2, 0x9bb3cc, 0.6);
  for (let x = fenceLeft; x <= fenceRight; x += 40) {
    fence.strokeLineShape(new Phaser.Geom.Line(x, fenceY + 40, x + 18, fenceY + 36));
  }

  const poles = scene.add.graphics();
  poles.lineStyle(3, 0xffd98a, 0.9);
  poles.strokeLineShape(new Phaser.Geom.Line(290, 160, 290, 310));
  poles.strokeLineShape(new Phaser.Geom.Line(990, 160, 990, 310));

  const crowd = scene.add.graphics();
  crowd.fillStyle(0x0b1b2a, 0.92);
  const crowdBaseY = 150;
  for (let x = 0; x < FIELD_WIDTH; x += 20) {
    const height = 18 + Math.floor(Math.random() * 18);
    crowd.fillRect(x, crowdBaseY - height, 16, height);
  }

  const scoreboard = scene.add.rectangle(640, 94, 220, 54, 0x0f2436, 0.85).setStrokeStyle(2, 0x4c6a8a, 0.9);

  const lights = scene.add.graphics();
  lights.fillStyle(0xfff6d4, 0.08);
  for (let i = 0; i < 6; i += 1) {
    const x = 180 + i * 180;
    lights.fillTriangle(x, 160, x - 90, 420, x + 90, 420);
  }

  const vignette = createVignette(scene);

  bg.setDepth(0);
  haze.setDepth(1);
  crowd.setDepth(2);
  fence.setDepth(3);
  poles.setDepth(3);
  field.setDepth(4);
  stripes.setDepth(4);
  fairShade.setDepth(4);
  dirt.setDepth(5);
  lines.setDepth(6);
  scoreboard.setDepth(8);
  lights.setDepth(7);
  vignette.setDepth(40);

  return { vignette, scoreboard, crowd, fence };
}
