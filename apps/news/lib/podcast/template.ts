export interface ScriptStory {
  title: string;
  summary: string;
  sources: string[];
}

export type VoiceMode = 'solo' | 'debate' | 'analyst' | 'rapid';

export interface ScriptOptions {
  showTitle: string;
  stories: ScriptStory[];
  mode: VoiceMode;
  sponsorSlot?: string;
}

export function generatePodcastScript(options: ScriptOptions): { script: string; segments: Array<{ speaker: string; text: string }> } {
  const intro = `Welcome to ${options.showTitle}.`;
  const sponsor = options.sponsorSlot ? `Sponsor message: ${options.sponsorSlot}.` : 'Sponsor message placeholder.';

  const segments: Array<{ speaker: string; text: string }> = [
    { speaker: 'music', text: 'INTRO_MUSIC_PLACEHOLDER' },
    { speaker: options.mode === 'debate' ? 'Host Alpha' : 'Narrator', text: intro },
    { speaker: 'Narrator', text: sponsor }
  ];

  for (let i = 0; i < options.stories.length; i += 1) {
    const story = options.stories[i];
    if (!story) {
      continue;
    }
    const transition = i === 0 ? 'Starting with our lead story.' : 'Next story.';
    const sourceAttribution = `Sources include: ${story.sources.join(', ') || 'multiple outlets'}.`;

    if (options.mode === 'debate') {
      segments.push({ speaker: 'Host Alpha', text: `${transition} ${story.title}. ${story.summary}` });
      segments.push({ speaker: 'Host Beta', text: `Counterpoint: key implications for listeners. ${sourceAttribution}` });
    } else if (options.mode === 'analyst') {
      segments.push({ speaker: 'Analyst', text: `${transition} ${story.title}. Analysis: ${story.summary}. ${sourceAttribution}` });
    } else if (options.mode === 'rapid') {
      segments.push({ speaker: 'Narrator', text: `${story.title}. ${sourceAttribution}` });
    } else {
      segments.push({ speaker: 'Narrator', text: `${transition} ${story.title}. ${story.summary}. ${sourceAttribution}` });
    }
  }

  segments.push({ speaker: 'Narrator', text: 'OUTRO_MUSIC_PLACEHOLDER. That concludes this briefing from ILLUVRSE News.' });

  return {
    script: segments.map((segment) => `${segment.speaker}: ${segment.text}`).join(' '),
    segments
  };
}
