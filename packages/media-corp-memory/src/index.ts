import { prisma, type PrismaClient } from "@illuvrse/db";

export type MediaMemoryEntry = {
  id: string;
  franchiseId?: string;
  agentId?: string;
  kind: string;
  key: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export interface MemoryStore {
  list(): Promise<MediaMemoryEntry[]>;
  write(entry: MediaMemoryEntry): Promise<void>;
}

export class InMemoryMemoryStore implements MemoryStore {
  constructor(private readonly entries: MediaMemoryEntry[] = []) {}

  async list() {
    return [...this.entries];
  }

  async write(entry: MediaMemoryEntry) {
    this.entries.push(entry);
  }
}

type DbClient = PrismaClient | typeof prisma;

export class PrismaMemoryStore implements MemoryStore {
  constructor(private readonly db: DbClient = prisma) {}

  async list() {
    const db = this.db as any;
    const rows = await db.mediaMemoryEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return rows.map((row) => ({
      id: row.externalId,
      franchiseId: row.franchiseExternalId ?? undefined,
      agentId: row.agentId ?? undefined,
      kind: row.kind,
      key: row.key,
      payload: row.payload as Record<string, unknown>,
      createdAt: row.createdAt.toISOString()
    }));
  }

  async write(entry: MediaMemoryEntry) {
    const db = this.db as any;
    await db.mediaMemoryEntry.upsert({
      where: { key: entry.key },
      update: {
        franchiseExternalId: entry.franchiseId,
        agentId: entry.agentId,
        kind: entry.kind,
        payload: entry.payload
      },
      create: {
        externalId: entry.id,
        franchiseExternalId: entry.franchiseId,
        agentId: entry.agentId,
        kind: entry.kind,
        key: entry.key,
        payload: entry.payload,
        createdAt: new Date(entry.createdAt)
      }
    });
  }
}
