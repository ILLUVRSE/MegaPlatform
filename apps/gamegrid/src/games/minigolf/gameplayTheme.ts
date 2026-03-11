export const MINIGOLF_INPUT_TUNING = {
  slopPx: 10,
  deadzonePx: 14,
  maxDragPx: 210,
  powerGamma: 1.6,
  angleSmoothing: 0.22,
  powerSmoothing: 0.24,
  maxShotPower: 900,
  cooldownMs: 70
} as const;

export const MINIGOLF_SIM_TUNING = {
  maxFrameDtSec: 1 / 20
} as const;

export const MINIGOLF_COLLISION_TUNING = {
  tangentialDamping: 0.9,
  maxBounceSpeed: 980,
  maxBounceSpeedGainRatio: 1.05,
  tinyVelocityEps: 0.8
} as const;

export const MINIGOLF_STOP_TUNING = {
  stopEps: 9,
  stopMs: 120,
  lowSpeedThreshold: 62,
  lowSpeedDamping: 34
} as const;

export const MINIGOLF_CUP_TUNING = {
  captureRadiusFactor: 0.78,
  captureSpeed: 150,
  flyByDotThreshold: 30,
  rimRadiusFactor: 1.06,
  lipDeflectStrength: 28,
  rollInDurationMs: 150
} as const;

export const MINIGOLF_CAMERA_TUNING = {
  aimZoomDelta: 0.02,
  followZoomDelta: 0.015,
  lookAheadMax: 34,
  settleSpeed: 0.12,
  followSpeed: 0.16,
  aimSpeed: 0.18
} as const;

