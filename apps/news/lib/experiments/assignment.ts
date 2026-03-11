import crypto from 'crypto';

export function assignVariant(userId: string, experimentId: string): 'A' | 'B' {
  const hash = crypto.createHash('sha256').update(`${userId}:${experimentId}`).digest('hex');
  const bit = parseInt(hash.slice(0, 2), 16) % 2;
  return bit === 0 ? 'A' : 'B';
}
