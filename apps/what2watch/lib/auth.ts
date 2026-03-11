import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'w2w_anon';

function createAnonId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function getOrCreateUserFromRequest(req: NextRequest): Promise<{ userId: string; anonId: string; setCookie?: string }> {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  const anonId = existing || req.headers.get('x-w2w-anon') || createAnonId();

  const user = await prisma.user.upsert({
    where: { anonId },
    update: {},
    create: {
      anonId,
      preference: {
        create: {
          genreWeights: {},
          platformWeights: {},
          runtimeWeights: { short: 0, medium: 0, long: 0 }
        }
      }
    }
  });

  return {
    userId: user.id,
    anonId,
    setCookie: existing ? undefined : `${COOKIE_NAME}=${anonId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  };
}

export async function getOrCreateUserServer(): Promise<{ userId: string; anonId: string }> {
  const jar = await cookies();
  const hdr = await headers();
  let anonId = jar.get(COOKIE_NAME)?.value || hdr.get('x-w2w-anon') || undefined;
  if (!anonId) {
    anonId = createAnonId();
  }

  const user = await prisma.user.upsert({
    where: { anonId },
    update: {},
    create: {
      anonId,
      preference: {
        create: {
          genreWeights: {},
          platformWeights: {},
          runtimeWeights: { short: 0, medium: 0, long: 0 }
        }
      }
    }
  });

  return { userId: user.id, anonId };
}
