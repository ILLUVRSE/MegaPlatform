import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('prisma query indexes', () => {
  it('keeps high-traffic query indexes defined in schema', () => {
    const schemaPath = join(process.cwd(), 'api', 'prisma', 'schema.prisma');
    const schema = readFileSync(schemaPath, 'utf-8');

    expect(schema).toContain('@@index([globalScore, updatedAt])');
    expect(schema).toContain('@@index([verticalScore, updatedAt])');
    expect(schema).toContain('@@index([localScore, updatedAt])');
    expect(schema).toContain('@@index([updatedAt])');
    expect(schema).toContain('@@index([sourceId, publishedAt])');
    expect(schema).toContain('@@index([queue, createdAt])');
    expect(schema).toContain('@@index([status, createdAt])');
    expect(schema).toContain('@@index([showType, publishedAt])');
  });
});
