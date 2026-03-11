import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateUserFromRequest } from '@/lib/auth';
import { getNotificationEvents, markNotificationRead } from '@/lib/services/notifications';

const markSchema = z.object({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  const items = await getNotificationEvents(user.userId);
  const res = NextResponse.json({ items });
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  const parsed = markSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;
  await markNotificationRead(user.userId, body.id);
  const res = NextResponse.json({ ok: true });
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}
