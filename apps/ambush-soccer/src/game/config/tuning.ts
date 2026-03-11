export const TUNING = {
  match: {
    regularTimeSec: 240,
    goalPauseMs: 1000
  },
  arena: {
    width: 1160,
    height: 680,
    wallThickness: 24,
    wallRestitution: 0.86,
    wallTangentialFriction: 0.94,
    goalWidth: 26,
    goalHeight: 220,
    goalInset: 2
  },
  camera: {
    followLerp: 0.09,
    maxOffsetFromCenterX: 90,
    maxOffsetFromCenterY: 55
  },
  player: {
    radius: 18,
    walkSpeed: 220,
    sprintSpeed: 310,
    acceleration: 2200,
    deceleration: 2000,
    staminaMax: 100,
    staminaDrainPerSec: 24,
    staminaRecoverPerSec: 18,
    staminaSprintThreshold: 8,
    tackleRange: 42,
    tackleCooldownSec: 0.55,
    dribbleInfluenceRadius: 40,
    dribbleInfluenceStrength: 0.22,
    switchSelectRadius: 380
  },
  ball: {
    radius: 11,
    frictionPerSecond: 0.9,
    maxSpeed: 620,
    passMinSpeed: 250,
    passMaxSpeed: 450,
    passAimConeDeg: 62,
    shootMinPower: 320,
    shootMaxPower: 760,
    shootChargeTimeSec: 1.1,
    maxPowerSpreadDeg: 6
  },
  ai: {
    chaseBallDistance: 240,
    supportDistance: 170,
    laneOffsetY: 120,
    aggressionDistance: 180,
    goalieReactionDelaySec: 0.14,
    goalieTrackSpeed: 265,
    goalieClearSpeed: 500,
    goalieCorridorHalfHeight: 120,
    goalieSaveRadius: 30
  }
} as const;
