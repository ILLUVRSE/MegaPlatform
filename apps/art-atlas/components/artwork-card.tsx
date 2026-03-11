import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import type { Artwork } from '@/lib/types';

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Card className="overflow-hidden">
      <Link href={`/artwork/${artwork.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river" aria-label={`Open ${artwork.title}`}>
        <Image
          src={artwork.image.url}
          alt={artwork.title}
          width={artwork.image.width}
          height={artwork.image.height}
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
      </Link>
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-wide text-river">{artwork.year ?? 'Unknown year'}</p>
        <h3 className="font-[var(--font-serif)] text-xl font-semibold text-ink dark:text-white">
          <Link href={`/artwork/${artwork.slug}`} className="hover:text-river focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river">
            {artwork.title}
          </Link>
        </h3>
        <p className="text-sm text-ink/75 dark:text-white/75">{artwork.institution}</p>
        <div className="flex flex-wrap gap-1.5">
          {artwork.themes.map((theme) => (
            <Tag key={theme}>{theme}</Tag>
          ))}
        </div>
      </div>
    </Card>
  );
}
