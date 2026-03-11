/**
 * Game detail page.
 * Request/response: renders playable game embed.
 * Guard: none; public view.
 */
import { notFound } from "next/navigation";
import GameEmbedFrame from "../components/GameEmbedFrame";
import { findGameBySlug } from "../data";

export default function GameDetailPage({ params }: { params: { slug: string } }) {
  const game = findGameBySlug(params.slug);
  if (!game) return notFound();

  return (
    <GameEmbedFrame
      slug={game.slug}
      title={game.title}
      description={game.description}
      embedPath={`/games/embed/${game.slug}`}
      playPath={`/games/play?seed=${encodeURIComponent(game.seed)}`}
    />
  );
}
