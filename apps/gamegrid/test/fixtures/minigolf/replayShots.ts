export interface MinigolfReplayFixtureShot {
  name: string;
  holeNumber: number;
  playerIndex: 0 | 1;
  expectedTurn: 0 | 1;
  power: number;
  angle: number;
  declaredEnd: { x: number; y: number };
  tolerance: number;
  expect: {
    reason: 'rest' | 'water';
    hitWall?: boolean;
    hitSand?: boolean;
    enteredWater?: boolean;
  };
}

export const minigolfReplayFixtureShots: MinigolfReplayFixtureShot[] = [
  {
    name: 'bumper-bounce-host',
    holeNumber: 1,
    playerIndex: 0,
    expectedTurn: 0,
    power: 0.48,
    angle: 0,
    declaredEnd: { x: 19.682, y: 110 },
    tolerance: 8,
    expect: { reason: 'rest', hitWall: true }
  },
  {
    name: 'bumper-bounce-client',
    holeNumber: 1,
    playerIndex: 1,
    expectedTurn: 1,
    power: 0.44,
    angle: 0.02,
    declaredEnd: { x: 15.106, y: 187.945 },
    tolerance: 8,
    expect: { reason: 'rest', hitWall: true }
  },
  {
    name: 'water-host',
    holeNumber: 2,
    playerIndex: 0,
    expectedTurn: 0,
    power: 0.42,
    angle: 0,
    declaredEnd: { x: 151.825, y: 110 },
    tolerance: 8,
    expect: { reason: 'water', enteredWater: true }
  },
  {
    name: 'water-client',
    holeNumber: 2,
    playerIndex: 1,
    expectedTurn: 1,
    power: 0.38,
    angle: -0.04,
    declaredEnd: { x: 151.96, y: 105.519 },
    tolerance: 8,
    expect: { reason: 'water', enteredWater: true }
  },
  {
    name: 'sand-host',
    holeNumber: 3,
    playerIndex: 0,
    expectedTurn: 0,
    power: 0.36,
    angle: 0.15,
    declaredEnd: { x: 174.383, y: 191.062 },
    tolerance: 8,
    expect: { reason: 'rest', hitWall: true, hitSand: true }
  },
  {
    name: 'sand-client',
    holeNumber: 3,
    playerIndex: 1,
    expectedTurn: 1,
    power: 0.4,
    angle: -0.1,
    declaredEnd: { x: 209.496, y: 25.417 },
    tolerance: 8,
    expect: { reason: 'rest', hitWall: true, hitSand: true }
  },
  {
    name: 'moving-gate-host',
    holeNumber: 4,
    playerIndex: 0,
    expectedTurn: 0,
    power: 0.5,
    angle: 0.04,
    declaredEnd: { x: 29.854, y: 147.323 },
    tolerance: 8,
    expect: { reason: 'rest', hitWall: true }
  },
  {
    name: 'moving-gate-client',
    holeNumber: 4,
    playerIndex: 1,
    expectedTurn: 1,
    power: 0.46,
    angle: -0.03,
    declaredEnd: { x: 38.234, y: 84.41 },
    tolerance: 8,
    expect: { reason: 'rest', hitWall: true }
  }
];
