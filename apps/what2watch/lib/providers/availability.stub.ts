import { TitleType } from '@prisma/client';
import { AvailabilityItem, StreamingProvider } from '@/lib/providers/contracts';

const platforms = ['netflix', 'hulu', 'prime-video', 'disney-plus', 'max', 'apple-tv-plus'];

class StubStreamingProvider implements StreamingProvider {
  async getAvailability(tmdbId: number, type: TitleType, region: string): Promise<AvailabilityItem[]> {
    const count = ((tmdbId + (type === 'movie' ? 0 : 1)) % 3) + 1;
    const picks = platforms.slice(0, count);

    return picks.map((platform, idx) => {
      const leavingSoon = (tmdbId + idx) % 6 === 0;
      const leavingDate = leavingSoon ? new Date(Date.now() + 1000 * 60 * 60 * 24 * (7 + idx)) : null;
      return {
        platform,
        region,
        url: `https://www.${platform.replace(/\s+/g, '')}.com/watch/${type}/${tmdbId}`,
        leavingDate
      };
    });
  }
}

export const stubStreamingProvider = new StubStreamingProvider();
