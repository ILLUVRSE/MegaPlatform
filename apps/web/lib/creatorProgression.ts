import { Prisma, prisma } from "@illuvrse/db";

const XP_PER_LEVEL = 500;

function tierForLevel(level: number) {
  if (level >= 20) return "ICON";
  if (level >= 10) return "PRO";
  if (level >= 5) return "RISING_PLUS";
  return "RISING";
}

export async function applyCreatorProgressEvent(input: {
  creatorProfileId: string;
  source: string;
  points: number;
  metadataJson?: Record<string, unknown>;
}) {
  const safePoints = Math.max(0, Math.trunc(input.points));
  if (safePoints === 0) return null;

  const current =
    (await prisma.creatorProgression.findUnique({
      where: { creatorProfileId: input.creatorProfileId }
    })) ??
    (await prisma.creatorProgression.create({
      data: {
        creatorProfileId: input.creatorProfileId,
        level: 1,
        xp: 0,
        tier: "RISING",
        rewardsEarned: 0
      }
    }));

  const nextXp = current.xp + safePoints;
  const nextLevel = Math.max(1, Math.floor(nextXp / XP_PER_LEVEL) + 1);
  const rewardDelta = Math.max(0, nextLevel - current.level);

  const [progression] = await prisma.$transaction([
    prisma.creatorProgression.update({
      where: { id: current.id },
      data: {
        xp: nextXp,
        level: nextLevel,
        tier: tierForLevel(nextLevel),
        rewardsEarned: current.rewardsEarned + rewardDelta
      }
    }),
    prisma.creatorProgressEvent.create({
      data: {
        creatorProfileId: input.creatorProfileId,
        source: input.source,
        points: safePoints,
        ...(input.metadataJson ? { metadataJson: input.metadataJson as Prisma.InputJsonValue } : {})
      }
    })
  ]);

  return progression;
}
