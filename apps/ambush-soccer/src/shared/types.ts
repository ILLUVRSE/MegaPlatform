export type TeamSide = 'home' | 'away';

export type Mode = 'quick' | 'local-versus' | 'practice' | 'online';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ArenaBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface GoalRect {
  x: number;
  y: number;
  width: number;
  height: number;
  team: TeamSide;
}

export interface PlayerInputState {
  moveX: number;
  moveY: number;
  sprint: boolean;
  passPressed: boolean;
  shootHeld: boolean;
  shootReleased: boolean;
  switchPressed: boolean;
  tacklePressed: boolean;
}

export interface MatchStats {
  shotsHome: number;
  shotsAway: number;
  savesHome: number;
  savesAway: number;
  tacklesHome: number;
  tacklesAway: number;
}

export interface MatchState {
  mode: Mode;
  homeScore: number;
  awayScore: number;
  timeRemainingSec: number;
  inOvertime: boolean;
  isPausedForGoal: boolean;
  goalPauseMsRemaining: number;
  stats: MatchStats;
}

export interface PassCandidate {
  id: string;
  team: TeamSide;
  fromBallOwner: boolean;
  position: Vec2;
}
