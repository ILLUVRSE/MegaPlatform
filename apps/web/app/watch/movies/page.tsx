/**
 * Movies stub page.
 */
import PosterCard from "../components/PosterCard";

const placeholders = [
  { id: "movie-1", title: "Stellar Drift", posterUrl: "https://placehold.co/400x600?text=Movie+1" },
  { id: "movie-2", title: "Neon Outpost", posterUrl: "https://placehold.co/400x600?text=Movie+2" },
  { id: "movie-3", title: "Aerial Bloom", posterUrl: "https://placehold.co/400x600?text=Movie+3" }
];

export default function WatchMoviesPage() {
  return (
    <div className="-mx-6 space-y-8 bg-[#07070b] px-6 pb-10 text-white">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Movies</p>
        <h1 className="text-3xl font-semibold">Coming soon</h1>
        <p className="text-sm text-white/60">
          Movie catalog is on the roadmap. Here are a few featured placeholders.
        </p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {placeholders.map((movie) => (
          <PosterCard key={movie.id} title={movie.title} imageUrl={movie.posterUrl} href="/watch" />
        ))}
      </div>
    </div>
  );
}
