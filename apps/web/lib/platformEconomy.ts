import { prisma } from "@illuvrse/db";
import type { SessionGraphIdentity } from "@/lib/platformSessionGraph";

const db = prisma as any;

function buildAudienceWhere(identity: SessionGraphIdentity) {
  return {
    OR: [
      identity.userId ? { userId: identity.userId } : undefined,
      identity.anonId ? { anonId: identity.anonId } : undefined,
      identity.creatorProfileId ? { creatorProfileId: identity.creatorProfileId } : undefined
    ].filter(Boolean)
  };
}

export async function seedPlatformEconomy(identity: SessionGraphIdentity) {
  const where = buildAudienceWhere(identity);
  const [entitlementCount, ledgerCount] = await Promise.all([
    db.platformEntitlement.count({ where }),
    db.platformLedgerEntry.count({ where })
  ]);

  if (entitlementCount === 0) {
    await db.platformEntitlement.createMany({
      data: [
        {
          userId: identity.userId ?? null,
          anonId: identity.anonId ?? null,
          creatorProfileId: identity.creatorProfileId ?? null,
          entitlementKey: "watch:premium-preview",
          source: "monetization_rules"
        },
        {
          userId: identity.userId ?? null,
          anonId: identity.anonId ?? null,
          creatorProfileId: identity.creatorProfileId ?? null,
          entitlementKey: "creator:control-center",
          source: "creator_progression"
        }
      ]
    });
  }

  if (ledgerCount === 0) {
    await db.platformLedgerEntry.createMany({
      data: [
        {
          userId: identity.userId ?? null,
          anonId: identity.anonId ?? null,
          creatorProfileId: identity.creatorProfileId ?? null,
          entryType: "reward",
          direction: "credit",
          amount: 2500,
          entitlementKey: "creator:control-center",
          referenceType: "progression"
        },
        {
          userId: identity.userId ?? null,
          anonId: identity.anonId ?? null,
          creatorProfileId: identity.creatorProfileId ?? null,
          entryType: "purchase",
          direction: "debit",
          amount: 900,
          entitlementKey: "watch:premium-preview",
          referenceType: "watch"
        }
      ]
    });
  }
}

export async function getPlatformEconomySummary(identity: SessionGraphIdentity) {
  await seedPlatformEconomy(identity);
  const where = buildAudienceWhere(identity);

  const [entitlements, ledgerEntries] = await Promise.all([
    db.platformEntitlement.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    db.platformLedgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const balance = ledgerEntries.reduce((total, entry) => total + (entry.direction === "credit" ? entry.amount : -entry.amount), 0);

  return {
    balance,
    currency: "USD_CENTS",
    entitlements: entitlements.map((entry) => ({
      key: entry.entitlementKey,
      source: entry.source,
      status: entry.status,
      expiresAt: entry.expiresAt?.toISOString() ?? null
    })),
    recentLedger: ledgerEntries.slice(0, 5).map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      direction: entry.direction,
      amount: entry.amount,
      createdAt: entry.createdAt.toISOString()
    }))
  };
}
