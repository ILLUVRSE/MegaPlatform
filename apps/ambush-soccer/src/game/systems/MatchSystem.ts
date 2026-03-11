import type { MatchState, Mode, TeamSide } from '../../shared/types';
import { TUNING } from '../config/tuning';

const createStats = () => ({
  shotsHome: 0,
  shotsAway: 0,
  savesHome: 0,
  savesAway: 0,
  tacklesHome: 0,
  tacklesAway: 0
});

export class MatchSystem {
  readonly state: MatchState;
  private ended = false;
  private winner: TeamSide | null = null;

  constructor(mode: Mode) {
    this.state = {
      mode,
      homeScore: 0,
      awayScore: 0,
      timeRemainingSec: TUNING.match.regularTimeSec,
      inOvertime: false,
      isPausedForGoal: false,
      goalPauseMsRemaining: 0,
      stats: createStats()
    };
  }

  tick(dt: number): void {
    if (this.ended) {
      return;
    }
    if (this.state.mode !== 'practice' && !this.state.isPausedForGoal) {
      this.state.timeRemainingSec -= dt;
      if (!this.state.inOvertime && this.state.timeRemainingSec <= 0) {
        if (this.state.homeScore === this.state.awayScore) {
          this.state.inOvertime = true;
          this.state.timeRemainingSec = 9999;
        } else {
          this.ended = true;
          this.winner = this.state.homeScore > this.state.awayScore ? 'home' : 'away';
        }
      }
    }
    if (this.state.isPausedForGoal) {
      this.state.goalPauseMsRemaining = Math.max(0, this.state.goalPauseMsRemaining - dt * 1000);
      if (this.state.goalPauseMsRemaining <= 0) {
        this.state.isPausedForGoal = false;
      }
    }
  }

  registerGoal(scoringTeam: TeamSide): void {
    if (scoringTeam === 'home') {
      this.state.homeScore += 1;
    } else {
      this.state.awayScore += 1;
    }

    if (this.state.inOvertime) {
      this.ended = true;
      this.winner = scoringTeam;
      return;
    }

    this.state.isPausedForGoal = true;
    this.state.goalPauseMsRemaining = TUNING.match.goalPauseMs;
  }

  isEnded(): boolean {
    return this.ended;
  }

  getWinner(): TeamSide | null {
    return this.winner;
  }
}
