export interface SummaryQualityInput {
  bullets: string[];
  whyItMatters: string[];
  citations: string[];
}

export function evaluateSummaryQuality(input: SummaryQualityInput): { score: number; metadata: Record<string, number | boolean> } {
  const allBullets = [...input.bullets, ...input.whyItMatters];
  const lengthViolations = allBullets.filter((bullet) => {
    const wordCount = bullet.trim().split(/\s+/).filter(Boolean).length;
    return wordCount < 4 || wordCount > 36;
  }).length;

  const normalized = allBullets.map((bullet) => bullet.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim());
  const unique = new Set(normalized);
  const overlapRate = normalized.length === 0 ? 1 : unique.size / normalized.length;
  const hasCitations = input.citations.length >= 1;

  const score = Math.max(
    0,
    Number((0.4 * overlapRate + 0.4 * (1 - lengthViolations / Math.max(1, allBullets.length)) + 0.2 * Number(hasCitations)).toFixed(4))
  );

  return {
    score,
    metadata: {
      lengthViolations,
      overlapRate: Number(overlapRate.toFixed(4)),
      citationCount: input.citations.length,
      hasCitations
    }
  };
}
