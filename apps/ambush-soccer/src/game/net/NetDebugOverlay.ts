import Phaser from 'phaser';

export class NetDebugOverlay {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(scene.scale.width - 16, 12, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#9fd2bf',
        align: 'right'
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2000);
  }

  update(pingMs: number, localTick: number, serverTick: number, packetLoss: number): void {
    this.text.setText(`PING ${Math.round(pingMs)}ms\nTick ${localTick}/${serverTick}\nLoss ${packetLoss.toFixed(1)}%`);
  }
}
