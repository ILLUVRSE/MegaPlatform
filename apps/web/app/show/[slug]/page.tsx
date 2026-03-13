/**
 * Show detail page.
 * Request/response: renders show metadata and episode list from Prisma.
 * Guard: none; public view.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@illuvrse/db";
import InteractiveExtrasPanel from "@/app/watch/components/InteractiveExtrasPanel";
import { listPublishedInteractiveExtrasForShowByProjectSlug } from "@/lib/interactiveExtras";
import { listPublishedShowExtrasForWatchByProjectSlug } from "@/lib/showExtras";

export default async function ShowPage({ params }: { params: { slug: string } }) {
  const now = new Date();
  const show = await prisma.show.findUnique({
    where: { slug: params.slug },
    include: {
      seasons: {
        orderBy: { number: "asc" },
        include: {
          episodes: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });

  if (!show) return notFound();

  const extras = await listPublishedShowExtrasForWatchByProjectSlug(show.slug, now);
  const interactiveExtras = await listPublishedInteractiveExtrasForShowByProjectSlug(show.slug);

  return (
    <div className="space-y-6">
      <section className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Show</p>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{show.title}</h1>
            <p className="text-sm text-illuvrse-muted">{show.description}</p>
            <div className="flex gap-3">
              <Link
                href="/party/create"
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
              >
                Host a Party
              </Link>
              <Link
                href="/watch"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              >
                Watch Premiere
              </Link>
            </div>
          </div>
          {show.heroUrl ? (
            <div
              className="h-40 w-64 rounded-3xl border border-illuvrse-border bg-cover bg-center"
              style={{ backgroundImage: `url(${show.heroUrl})` }}
            />
          ) : null}
        </div>
      </section>
      <section className="party-card space-y-4">
        <h2 className="text-xl font-semibold">Episodes</h2>
        {show.seasons.length === 0 ? (
          <p className="text-sm text-illuvrse-muted">No seasons yet.</p>
        ) : (
          <div className="space-y-4">
            {show.seasons.map((season) => (
              <div key={season.id} className="space-y-2">
                <h3 className="text-lg font-semibold">Season {season.number}: {season.title}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {season.episodes.map((episode) => (
                    <div key={episode.id} className="rounded-2xl border border-illuvrse-border p-3">
                      <p className="font-semibold">{episode.title}</p>
                      <p className="text-xs text-illuvrse-muted">{episode.description}</p>
                      <p className="text-xs text-illuvrse-muted">{episode.assetUrl}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {interactiveExtras.length > 0 ? (
        <section className="party-card space-y-4">
          <InteractiveExtrasPanel
            extras={interactiveExtras.map((extra) => ({
              id: extra.id,
              type: extra.type,
              title: extra.title,
              payload: extra.payload
            }))}
            title="Interactive Extras"
          />
        </section>
      ) : null}
      <section className="party-card space-y-4">
        <h2 className="text-xl font-semibold">Extras</h2>
        {extras.length === 0 ? (
          <p className="text-sm text-illuvrse-muted">No extras published yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {extras.map((extra) => (
              <a
                key={extra.id}
                href={extra.assetUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-illuvrse-border p-3 transition hover:border-cyan-300/40"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-illuvrse-muted">{extra.type}</p>
                <p className="mt-2 font-semibold">{extra.title}</p>
                <p className="mt-1 text-xs text-illuvrse-muted">{extra.description}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
