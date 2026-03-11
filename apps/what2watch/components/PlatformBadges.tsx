import { platformLabel } from '@/lib/platforms';

export function PlatformBadges({ platforms }: { platforms: string[] }) {
  if (!platforms.length) return <p className="text-xs text-surf/50">No streaming data yet</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <span key={platform} className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs">
          {platformLabel(platform)}
        </span>
      ))}
    </div>
  );
}
