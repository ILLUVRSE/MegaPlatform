export type GameItem = {
  slug: string;
  title: string;
  description: string;
  cover: string;
  seed: string;
};

export const GAMES: GameItem[] = [
  {
    slug: "cosmic-runner",
    title: "Cosmic Runner",
    description: "Dodge asteroid belts and collect stardust.",
    cover: "https://placehold.co/640x360?text=Cosmic+Runner",
    seed: "catalog-cosmic-runner"
  },
  {
    slug: "neon-arcade",
    title: "Neon Arcade",
    description: "Retro puzzles with a glow.",
    cover: "https://placehold.co/640x360?text=Neon+Arcade",
    seed: "catalog-neon-arcade"
  },
  {
    slug: "gravity-tiles",
    title: "Gravity Tiles",
    description: "Flip the board and survive the gravity shift.",
    cover: "https://placehold.co/640x360?text=Gravity+Tiles",
    seed: "catalog-gravity-tiles"
  }
];

export function findGameBySlug(slug: string) {
  return GAMES.find((entry) => entry.slug === slug);
}
