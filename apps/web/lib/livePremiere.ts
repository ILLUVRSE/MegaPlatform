export type PremiereState = "VOD" | "UPCOMING" | "LIVE";

type LivePremiereInput = {
  isPremiereEnabled?: boolean | null;
  premiereStartsAt?: Date | null;
  premiereEndsAt?: Date | null;
  chatEnabled?: boolean | null;
  lengthSeconds?: number | null;
};

export type LivePremiereStatus = {
  isPremiereEnabled: boolean;
  state: PremiereState;
  startsAt: Date | null;
  endsAt: Date | null;
  effectiveEndsAt: Date | null;
  chatEnabled: boolean;
};

function isValidDate(value: Date | null | undefined): value is Date {
  return Boolean(value && !Number.isNaN(value.getTime()));
}

export function getLivePremiereStatus(input: LivePremiereInput, now = new Date()): LivePremiereStatus {
  const startsAt = isValidDate(input.premiereStartsAt) ? input.premiereStartsAt : null;
  const endsAt = isValidDate(input.premiereEndsAt) ? input.premiereEndsAt : null;

  if (!input.isPremiereEnabled || !startsAt) {
    return {
      isPremiereEnabled: false,
      state: "VOD",
      startsAt: null,
      endsAt: null,
      effectiveEndsAt: null,
      chatEnabled: false
    };
  }

  const effectiveEndsAt =
    endsAt ??
    (typeof input.lengthSeconds === "number" && input.lengthSeconds > 0
      ? new Date(startsAt.getTime() + input.lengthSeconds * 1000)
      : null);

  if (now.getTime() < startsAt.getTime()) {
    return {
      isPremiereEnabled: true,
      state: "UPCOMING",
      startsAt,
      endsAt,
      effectiveEndsAt,
      chatEnabled: Boolean(input.chatEnabled)
    };
  }

  if (effectiveEndsAt && now.getTime() >= effectiveEndsAt.getTime()) {
    return {
      isPremiereEnabled: true,
      state: "VOD",
      startsAt,
      endsAt,
      effectiveEndsAt,
      chatEnabled: Boolean(input.chatEnabled)
    };
  }

  return {
    isPremiereEnabled: true,
    state: "LIVE",
    startsAt,
    endsAt,
    effectiveEndsAt,
    chatEnabled: Boolean(input.chatEnabled)
  };
}

export function canAccessPremiereEpisodePage(input: LivePremiereInput, now = new Date()) {
  return getLivePremiereStatus(input, now).isPremiereEnabled;
}
