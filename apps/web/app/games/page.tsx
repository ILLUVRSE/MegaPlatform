/**
 * Games landing page.
 * Request/response: renders catalog plus minigame generator experience.
 * Guard: none; public view.
 */
import GamesCatalog from "./components/GamesCatalog";
import MinigameGenerator from "./components/MinigameGenerator";
import Link from "next/link";
import { GAMES_LOCAL_NAV } from "@/lib/navigation";

export default function GamesPage() {
  return (
    <div className="space-y-10">
      <nav className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-illuvrse-muted">
        {GAMES_LOCAL_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-full border border-illuvrse-border px-3 py-1 hover:text-illuvrse-text">
            {item.label}
          </Link>
        ))}
      </nav>
      <GamesCatalog />
      <MinigameGenerator />
    </div>
  );
}
