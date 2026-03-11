export function isGamingCluster(title: string, bullets: string[]): boolean {
  const haystack = [title, ...bullets].join(' ').toLowerCase();
  const terms = ['game', 'gaming', 'esports', 'stream', 'creator', 'platform', 'web3'];
  return terms.some((term) => haystack.includes(term));
}

export function buildVerticalIntelligence(title: string): {
  builderTakeaway: string[];
  monetizationImpact: string[];
  platformImplications: string[];
} {
  return {
    builderTakeaway: [`Builders should monitor fast-follow features around: ${title}.`],
    monetizationImpact: ['Revenue models may shift toward subscriptions, creator tools, and ad inventory repricing.'],
    platformImplications: ['Platform policy and distribution leverage are likely to become key strategic constraints.']
  };
}
