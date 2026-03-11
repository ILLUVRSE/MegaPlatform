import Phaser from 'phaser';

export interface CourtArt {
  court: Phaser.GameObjects.Graphics;
  backboard: Phaser.GameObjects.Graphics;
  rim: Phaser.GameObjects.Graphics;
  net: Phaser.GameObjects.Graphics;
  foreground: Phaser.GameObjects.Graphics;
}

export function buildCourtArt(scene: Phaser.Scene, hoopX: number, hoopY: number, rimRadius: number, backboardX: number): CourtArt {
  const court = scene.add.graphics();
  const backboard = scene.add.graphics();
  const rim = scene.add.graphics();
  const net = scene.add.graphics();
  const foreground = scene.add.graphics();

  court.fillStyle(0x0b1626, 1);
  court.fillRect(0, 0, 1280, 720);

  // Subtle vignette and lane lighting.
  court.fillStyle(0x12253c, 0.6);
  court.fillRect(0, 420, 1280, 320);
  court.fillStyle(0x0f1c2e, 0.8);
  court.fillRect(0, 570, 1280, 150);

  // Court texture bands.
  for (let i = 0; i < 9; i += 1) {
    court.fillStyle(i % 2 === 0 ? 0x183654 : 0x152f4a, 0.35);
    court.fillRect(0, 430 + i * 32, 1280, 32);
  }

  // Key/lane markings.
  court.lineStyle(3, 0x7eb2de, 0.6);
  court.strokeRect(560, 470, 400, 220);
  court.strokeCircle(760, 640, 210);

  court.lineStyle(2, 0x9cc6e8, 0.7);
  court.strokeCircle(760, 560, 58);
  court.strokeLineShape(new Phaser.Geom.Line(560, 580, 960, 580));

  // Baseline glow.
  court.fillStyle(0x1f4670, 0.55);
  court.fillRect(0, 660, 1280, 20);

  // Backboard.
  backboard.fillStyle(0xbfd6f4, 0.15);
  backboard.fillRect(backboardX - 8, hoopY - 78, 18, 138);
  backboard.lineStyle(3, 0xd8ecff, 0.6);
  backboard.strokeRect(backboardX - 6, hoopY - 76, 14, 134);
  backboard.lineStyle(2, 0x9cc6e8, 0.6);
  backboard.strokeRect(backboardX - 38, hoopY - 34, 36, 30);

  // Rim.
  rim.lineStyle(10, 0xf07a2a, 1);
  rim.beginPath();
  rim.arc(hoopX, hoopY, rimRadius, 0.15, Math.PI - 0.15, false);
  rim.strokePath();
  rim.lineStyle(3, 0xffc187, 0.9);
  rim.beginPath();
  rim.arc(hoopX, hoopY - 2, rimRadius - 4, 0.15, Math.PI - 0.15, false);
  rim.strokePath();

  // Net strands.
  net.lineStyle(2, 0xe5f2ff, 0.75);
  for (let i = 0; i < 10; i += 1) {
    const x = hoopX - 26 + i * 6;
    net.beginPath();
    net.moveTo(x, hoopY + 10);
    net.lineTo(x + (i % 2 === 0 ? -5 : 5), hoopY + 50);
    net.strokePath();
  }

  // Foreground shading (near-camera floor).
  foreground.fillStyle(0x0a131f, 0.5);
  foreground.fillRect(0, 680, 1280, 40);

  return { court, backboard, rim, net, foreground };
}
