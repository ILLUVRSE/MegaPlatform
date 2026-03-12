/**
 * Games landing page.
 * Request/response: renders catalog plus minigame generator experience.
 * Guard: none; public view.
 */
import Link from "next/link";
import MinigameGenerator from "./components/MinigameGenerator";
import { GAMES_LOCAL_NAV } from "@/lib/navigation";
import { GAMES } from "@/src/domains/creator/games/catalog";

export default function GamesPage() {
  const sections = [
    { title: "Popular", items: GAMES },
    { title: "New", items: [...GAMES].reverse() },
    { title: "Multiplayer", items: [GAMES[1], GAMES[0], GAMES[2]].filter((game): game is (typeof GAMES)[number] => Boolean(game)) }
  ];

  return (
    <div className="space-y-8">
      <section className="platform-panel-dark">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Games</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Treat every game like an experience.</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/56">
              Featured worlds, fast session starts, and an arcade lane for quick drops into multiplayer energy.
            </p>
          </div>
          <Link href="/gamegrid" className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
            Open GameGrid
          </Link>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        {GAMES_LOCAL_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/62 hover:text-white">
            {item.label}
          </Link>
        ))}
      </nav>

      {sections.map((section) => (
        <section key={section.title} className="platform-section">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">{section.title}</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{section.title} games</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {section.items.map((game, index) => (
              <Link key={`${section.title}-${game.slug}`} href={`/games/${game.slug}`} className="platform-tile block p-4 text-white">
                <img src={game.cover} alt={game.title} className="h-44 w-full rounded-[22px] object-cover" />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{game.title}</h3>
                    <p className="mt-2 text-sm text-white/56">{game.description}</p>
                    <p className="mt-3 text-sm text-white/56">
                      {section.title === "Popular"
                        ? `${12 - index * 2}k playing`
                        : section.title === "New"
                          ? `New drop ${index + 1}`
                          : "Party ready"}
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    4.{8 - index}
                  </span>
                </div>
                <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-950">
                  Play
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="platform-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Creator lane</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Build the next quick-play hit</h2>
        </div>
        <MinigameGenerator />
      </section>
    </div>
  );
}
