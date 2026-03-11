export interface SourceSnippet {
  title: string;
  url: string;
  category: 'global' | 'vertical' | 'local';
}

export interface ClusterSummary {
  whatHappened: string[];
  whyItMatters: string[];
  localAngle: string[] | null;
  verticalAngle: string[] | null;
  citations: string[];
}

export function summarizeCluster(stories: SourceSnippet[]): ClusterSummary {
  const primary = stories.slice(0, 5);
  const whatHappened = primary.map((story, idx) => `${idx + 1}. ${story.title}`);
  const whyItMatters = [
    'Cross-source convergence indicates this story is materially important.',
    'Developments may affect policy, audience behavior, or market positioning.'
  ];

  const localCount = stories.filter((story) => story.category === 'local').length;
  const verticalCount = stories.filter((story) => story.category === 'vertical').length;

  return {
    whatHappened,
    whyItMatters,
    localAngle: localCount > 0 ? ['Local stakeholders face direct operational and community impact.'] : null,
    verticalAngle: verticalCount > 0 ? ['The gaming and creator economy angle is likely to evolve quickly.'] : null,
    citations: stories.slice(0, Math.max(2, Math.min(stories.length, 5))).map((story) => story.url)
  };
}
