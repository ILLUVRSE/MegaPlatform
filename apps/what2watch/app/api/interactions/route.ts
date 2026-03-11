import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateUserFromRequest } from '@/lib/auth';
import { isRateLimited } from '@/lib/rate-limit';
import { recordInteraction } from '@/lib/services/interactions';

const schema = z.object({
  titleId: z.string().min(1),
  type: z.enum(['like', 'dislike', 'detail', 'watchlist_add', 'watchlist_remove'])
});

export async function POST(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  if (isRateLimited(`interactions:${user.anonId}`, 180, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;
  await recordInteraction({ userId: user.userId, titleId: body.titleId, type: body.type });

  const res = NextResponse.json({ ok: true });
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}
