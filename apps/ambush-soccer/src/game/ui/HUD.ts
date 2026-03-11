import Phaser from 'phaser';
import type { MatchState } from '../../shared/types';

const formatClock = (timeRemainingSec: number): string => {
  const sec = Math.max(0, Math.floor(timeRemainingSec));
  const minutes = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export class HUD {
  private scoreText: Phaser.GameObjects.Text;
  private clockText: Phaser.GameObjects.Text;
  private bannerText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scoreText = scene.add
      .text(20, 16, 'HOME 0 - 0 AWAY', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#e8fff6'
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.clockText = scene.add
      .text(20, 48, '04:00', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#8ef0c5'
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.bannerText = scene.add
      .text(scene.scale.width / 2, 24, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: '#ffe066'
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);
  }

  update(state: MatchState): void {
    this.scoreText.setText(`HOME ${state.homeScore} - ${state.awayScore} AWAY`);
    this.clockText.setText(state.mode === 'practice' ? 'PRACTICE' : state.inOvertime ? 'OT' : formatClock(state.timeRemainingSec));
  }

  showBanner(text: string): void {
    this.bannerText.setText(text);
    this.bannerText.setVisible(true);
  }

  hideBanner(): void {
    this.bannerText.setVisible(false);
  }
}
