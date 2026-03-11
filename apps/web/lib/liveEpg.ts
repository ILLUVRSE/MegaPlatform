export type ProgramLike = {
  id: string;
  channelId: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  episodeId?: string | null;
  episode?: {
    title: string;
    assetUrl: string;
  } | null;
  streamUrl?: string | null;
};

export function computeNowNext(programs: ProgramLike[], now = new Date()) {
  const sorted = [...programs].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const nowProgram =
    sorted.find(
      (program) => program.startsAt.getTime() <= now.getTime() && program.endsAt.getTime() > now.getTime()
    ) ?? null;
  const nextProgram =
    sorted.find((program) => program.startsAt.getTime() > now.getTime()) ?? null;

  return { now: nowProgram, next: nextProgram };
}
