import { prisma } from "@illuvrse/db";

function normalizeHandle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export async function ensureCreatorProfile(user: { id: string; name?: string | null; email?: string | null }) {
  const existing = await prisma.creatorProfile.findUnique({
    where: { userId: user.id }
  });
  if (existing) return existing;

  const fallback = user.name?.trim() || user.email?.split("@")[0] || `creator-${user.id.slice(0, 8)}`;
  const baseHandle = normalizeHandle(fallback) || `creator-${user.id.slice(0, 8)}`;

  let handle = baseHandle;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await prisma.creatorProfile.create({
        data: {
          userId: user.id,
          handle,
          displayName: user.name?.trim() || "Creator",
          reputationScore: 0,
          level: 1,
          badges: []
        }
      });
    } catch {
      handle = `${baseHandle}-${attempt + 1}`;
    }
  }

  throw new Error("Unable to create creator profile");
}
