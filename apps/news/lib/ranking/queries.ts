import { PrismaClient } from '@prisma/client';
import { getCached, setCached } from './cache';

const TTL_MS = 30_000;

export async function getGlobalTopClusters(prisma: PrismaClient, take = 20, offset = 0) {
  const key = `global:${take}:${offset}`;
  const cached = getCached<Awaited<ReturnType<PrismaClient['cluster']['findMany']>>>(key);
  if (cached) {
    return cached;
  }
  const result = await prisma.cluster.findMany({ orderBy: { globalScore: 'desc' }, take, skip: offset });
  setCached(key, result, TTL_MS);
  return result;
}

export async function getVerticalTopClusters(prisma: PrismaClient, take = 20, offset = 0) {
  const key = `vertical:${take}:${offset}`;
  const cached = getCached<Awaited<ReturnType<PrismaClient['cluster']['findMany']>>>(key);
  if (cached) {
    return cached;
  }
  const result = await prisma.cluster.findMany({ orderBy: { verticalScore: 'desc' }, take, skip: offset });
  setCached(key, result, TTL_MS);
  return result;
}

export async function getLocalTopClusters(prisma: PrismaClient, take = 20, offset = 0) {
  const key = `local:${take}:${offset}`;
  const cached = getCached<Awaited<ReturnType<PrismaClient['cluster']['findMany']>>>(key);
  if (cached) {
    return cached;
  }
  const result = await prisma.cluster.findMany({ orderBy: { localScore: 'desc' }, take, skip: offset });
  setCached(key, result, TTL_MS);
  return result;
}
