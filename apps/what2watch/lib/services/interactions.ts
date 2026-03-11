import { InteractionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updatePreferenceByInteraction } from '@/lib/preferences';

export async function recordInteraction(input: {
  userId: string;
  titleId: string;
  type: InteractionType;
}): Promise<void> {
  await prisma.userInteraction.create({
    data: {
      userId: input.userId,
      titleId: input.titleId,
      type: input.type
    }
  });

  const [pref, title] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId: input.userId } }),
    prisma.title.findUnique({
      where: { id: input.titleId },
      include: {
        genres: { include: { genre: true } },
        availability: true
      }
    })
  ]);

  if (!pref || !title) return;

  const next = updatePreferenceByInteraction(pref, title, input.type);

  await prisma.userPreference.update({
    where: { userId: input.userId },
    data: {
      genreWeights: next.genreWeights,
      platformWeights: next.platformWeights,
      runtimeWeights: next.runtimeWeights
    }
  });
}
