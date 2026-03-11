import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { artworks, atlasMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Sources & Rights',
  description: 'Source references, rights statements, and attribution table for Bingham Atlas.',
  openGraph: {
    title: 'Bingham Atlas — Sources & Rights',
    description: 'Review source URLs and rights statements for each artwork in the atlas.'
  }
};

export default function SourcesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionTitle title="Sources & Rights" subtitle="Public-domain and institution-provided images" />

      <Card className="p-5">
        <p className="text-sm text-ink/85 dark:text-white/85">
          Public-domain artworks can still be served through institutions or repositories with specific credit preferences. Institution-provided digital files may include additional
          usage conditions. This page is informational only and not legal advice.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">Core references</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink/85 dark:text-white/85">
          <li>
            <a href={atlasMeta.biographySource.url} target="_blank" rel="noreferrer" className="text-river underline-offset-2 hover:underline">
              {atlasMeta.biographySource.title}
            </a>
          </li>
          <li>
            <a href={atlasMeta.furtherStudy.url} target="_blank" rel="noreferrer" className="text-river underline-offset-2 hover:underline">
              {atlasMeta.furtherStudy.title}
            </a>
          </li>
          <li>
            <a href="https://commons.wikimedia.org/wiki/Category:Paintings_by_George_Caleb_Bingham" target="_blank" rel="noreferrer" className="text-river underline-offset-2 hover:underline">
              Wikimedia Commons category: Paintings by George Caleb Bingham
            </a>
          </li>
        </ul>
      </Card>

      <section className="space-y-3 print:space-y-2">
        <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">Artwork rights table</h2>
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-slate print:overflow-visible print:border-0 print:p-0">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/80 dark:border-white/10 dark:text-white/80">
                <th className="px-2 py-2 font-semibold">Work</th>
                <th className="px-2 py-2 font-semibold">Source</th>
                <th className="px-2 py-2 font-semibold">Rights</th>
                <th className="px-2 py-2 font-semibold">Verified</th>
              </tr>
            </thead>
            <tbody>
              {artworks.map((artwork) => (
                <tr key={artwork.slug} className="border-b border-ink/5 align-top dark:border-white/10">
                  <td className="px-2 py-2">
                    <p className="font-semibold text-ink dark:text-white">{artwork.title}</p>
                    <p className="text-xs text-ink/65 dark:text-white/65">{artwork.institution}</p>
                  </td>
                  <td className="px-2 py-2">
                    <a href={artwork.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-river underline-offset-2 hover:underline">
                      {artwork.sourceUrl}
                    </a>
                  </td>
                  <td className="px-2 py-2 text-xs text-ink/75 dark:text-white/75">{artwork.rights}</td>
                  <td className="px-2 py-2 text-xs text-ink/75 dark:text-white/75">{artwork.lastVerified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
