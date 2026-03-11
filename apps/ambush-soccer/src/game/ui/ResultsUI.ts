import Phaser from 'phaser';
import type { MatchState } from '../../shared/types';

export class ResultsUI {
  constructor(scene: Phaser.Scene, state: MatchState) {
    scene.add
      .text(scene.scale.width / 2, 90, 'FINAL SCORE', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '48px',
        color: '#e7fff4'
      })
      .setOrigin(0.5);

    scene.add
      .text(scene.scale.width / 2, 160, `HOME ${state.homeScore} - ${state.awayScore} AWAY`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '42px',
        color: '#fff3a2'
      })
      .setOrigin(0.5);

    const stats = state.stats;
    const lines = [
      `Shots: H ${stats.shotsHome} / A ${stats.shotsAway}`,
      `Saves: H ${stats.savesHome} / A ${stats.savesAway}`,
      `Tackles: H ${stats.tacklesHome} / A ${stats.tacklesAway}`
    ];

    lines.forEach((line, i) => {
      scene.add
        .text(scene.scale.width / 2, 250 + i * 46, line, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '30px',
          color: '#baf4d3'
        })
        .setOrigin(0.5);
    });

    scene.add
      .text(scene.scale.width / 2, scene.scale.height - 70, 'Press Enter/Space to return to menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '22px',
        color: '#8abfa8'
      })
      .setOrigin(0.5);
  }
}
