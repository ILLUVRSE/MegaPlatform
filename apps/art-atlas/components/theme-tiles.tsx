import Link from 'next/link';
import { Card } from '@/components/ui/card';

const tiles = [
  {
    title: 'River Life',
    description: 'Commerce, labor, and social scenes along interior waterways.',
    color: 'from-river/90 to-pine/80'
  },
  {
    title: 'Politics',
    description: 'Election ritual, rhetoric, and civic tension in Missouri.',
    color: 'from-bronze/90 to-river/80'
  },
  {
    title: 'Portraits',
    description: 'Individual worker and civic identities at human scale.',
    color: 'from-pine/90 to-ink/80'
  },
  {
    title: 'Landscape',
    description: 'Regional place-making from pastoral calm to weather drama.',
    color: 'from-emerald-700 to-pine/90'
  }
];

export function ThemeTiles() {
  return (
    <section aria-labelledby="theme-heading" className="space-y-4">
      <h2 id="theme-heading" className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">
        Explore by Theme
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.title} className="overflow-hidden border-0 shadow-card">
            <Link
              href={`/gallery?themes=${encodeURIComponent(tile.title)}`}
              className={`group block h-full bg-gradient-to-br ${tile.color} p-5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            >
              <h3 className="font-[var(--font-serif)] text-xl font-semibold">{tile.title}</h3>
              <p className="mt-2 text-sm text-white/90">{tile.description}</p>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
