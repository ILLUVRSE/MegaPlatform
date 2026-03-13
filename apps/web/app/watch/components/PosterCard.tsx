/**
 * Poster card for shows/episodes.
 */
import Link from "next/link";
import MyListToggleButton from "./MyListToggleButton";
import SurfaceCard from "@/components/ui/SurfaceCard";

export default function PosterCard({
  title,
  subtitle,
  imageUrl,
  href,
  showId,
  canSave,
  initialSaved
}: {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href: string;
  showId?: string;
  canSave?: boolean;
  initialSaved?: boolean;
}) {
  return (
    <div className="relative flex w-40 flex-col gap-2 text-white">
      {showId && canSave ? (
        <div className="absolute right-2 top-2 z-10">
          <MyListToggleButton showId={showId} initialSaved={initialSaved ?? false} />
        </div>
      ) : null}
      <Link
        href={href}
        className="interactive-focus group relative flex flex-col gap-2 rounded-2xl"
        title={title}
        data-testid="poster-card"
        aria-label={subtitle ? `${title}: ${subtitle}` : title}
      >
        <SurfaceCard tone="dark" className="relative rounded-2xl">
          <div className="aspect-[2/3] w-full">
            <img
              src={imageUrl ?? "https://placehold.co/400x600?text=ILLUVRSE"}
              alt={title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 transition group-hover:ring-white/40" />
        </SurfaceCard>
        <div>
          <p className="truncate text-sm font-semibold">{title}</p>
          {subtitle ? <p className="truncate text-xs text-white/78">{subtitle}</p> : null}
        </div>
      </Link>
    </div>
  );
}
