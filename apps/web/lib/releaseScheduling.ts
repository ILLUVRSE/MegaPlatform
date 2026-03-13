export const PREMIERE_TYPES = ["IMMEDIATE", "SCHEDULED"] as const;

export type PremiereType = (typeof PREMIERE_TYPES)[number];

export type ReleaseSchedule = {
  premiereType: PremiereType;
  releaseAt: Date | null;
};

type ReleaseScheduleLike = {
  premiereType?: PremiereType | null;
  releaseAt?: Date | null;
  [key: string]: unknown;
};

export class ReleaseScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseScheduleError";
  }
}

export function normalizeReleaseSchedule(input: ReleaseScheduleLike, now = new Date()): ReleaseSchedule {
  const premiereType = input.premiereType === "SCHEDULED" ? "SCHEDULED" : "IMMEDIATE";
  const releaseAt = input.releaseAt ?? null;

  if (premiereType === "IMMEDIATE") {
    return {
      premiereType,
      releaseAt: null
    };
  }

  if (!releaseAt || Number.isNaN(releaseAt.getTime())) {
    throw new ReleaseScheduleError("Scheduled premieres require a valid release date and time.");
  }

  if (releaseAt.getTime() <= now.getTime()) {
    throw new ReleaseScheduleError("Scheduled premieres must use a future release date and time.");
  }

  return {
    premiereType,
    releaseAt
  };
}

export function evaluateReleaseSchedule(input: ReleaseScheduleLike, now = new Date()) {
  const premiereType = input.premiereType === "SCHEDULED" ? "SCHEDULED" : "IMMEDIATE";
  const releaseAt = premiereType === "SCHEDULED" ? input.releaseAt ?? null : null;
  const isComingSoon = Boolean(releaseAt && releaseAt.getTime() > now.getTime());

  return {
    premiereType,
    releaseAt,
    isReleased: !isComingSoon,
    isComingSoon
  };
}

export function isReleased(input: ReleaseScheduleLike, now = new Date()) {
  return evaluateReleaseSchedule(input, now).isReleased;
}

export function getEarliestUpcomingRelease<T extends ReleaseScheduleLike>(items: T[], now = new Date()) {
  return items
    .map((item) => evaluateReleaseSchedule(item, now).releaseAt)
    .filter((value): value is Date => Boolean(value && value.getTime() > now.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}
