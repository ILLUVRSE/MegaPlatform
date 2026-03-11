import { notFound } from "next/navigation";
import MinigameFrame from "@/src/domains/creator/games/components/MinigameFrame";
import { findGameBySlug } from "@/src/domains/creator/games/catalog";
import { generateRandomMinigame } from "@/lib/minigame/generator";

export default function GameEmbedPage({ params }: { params: { slug: string } }) {
  const game = findGameBySlug(params.slug);
  if (!game) return notFound();

  const spec = generateRandomMinigame({ seed: game.seed });
  const titledSpec = { ...spec, title: game.title, tagline: game.description };

  return (
    <main className="min-h-screen bg-white p-4">
      <MinigameFrame spec={titledSpec} />
    </main>
  );
}
