import type { MinigameTheme } from "./spec";

export type ThemePalette = {
  id: string;
  name: string;
  colors: {
    background: string;
    backgroundSecondary: string;
    accent: string;
    accentSoft: string;
    text: string;
    danger: string;
  };
  theme: MinigameTheme;
};

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: "neon-burst",
    name: "Neon Burst",
    colors: {
      background: "#0b0b1a",
      backgroundSecondary: "#171740",
      accent: "#4ff3ff",
      accentSoft: "#7a5cff",
      text: "#ffffff",
      danger: "#ff5c7a"
    },
    theme: {
      palette: "neon-burst",
      bgStyle: "grid-glow",
      sfxStyle: "synth-pop",
      particles: "spark"
    }
  },
  {
    id: "sunset-soda",
    name: "Sunset Soda",
    colors: {
      background: "#2b0d3c",
      backgroundSecondary: "#5c1f3c",
      accent: "#ffb347",
      accentSoft: "#ff6f91",
      text: "#fff5e6",
      danger: "#ff3f6e"
    },
    theme: {
      palette: "sunset-soda",
      bgStyle: "radial-wave",
      sfxStyle: "arcade-pop",
      particles: "bubbles"
    }
  },
  {
    id: "mint-arcade",
    name: "Mint Arcade",
    colors: {
      background: "#0b1d1f",
      backgroundSecondary: "#0f2f33",
      accent: "#5effc3",
      accentSoft: "#49c0ff",
      text: "#eafff8",
      danger: "#ff8077"
    },
    theme: {
      palette: "mint-arcade",
      bgStyle: "scanlines",
      sfxStyle: "chiptune",
      particles: "confetti"
    }
  },
  {
    id: "berry-boost",
    name: "Berry Boost",
    colors: {
      background: "#170c2b",
      backgroundSecondary: "#271347",
      accent: "#ff8df4",
      accentSoft: "#a78bfa",
      text: "#f5f0ff",
      danger: "#ff5c7a"
    },
    theme: {
      palette: "berry-boost",
      bgStyle: "checker",
      sfxStyle: "glitter",
      particles: "stars"
    }
  },
  {
    id: "citrus-sprint",
    name: "Citrus Sprint",
    colors: {
      background: "#09210f",
      backgroundSecondary: "#0d3a18",
      accent: "#f9ff6b",
      accentSoft: "#9dff84",
      text: "#f2ffe8",
      danger: "#ff5f5f"
    },
    theme: {
      palette: "citrus-sprint",
      bgStyle: "sunburst",
      sfxStyle: "stadium",
      particles: "leaves"
    }
  }
];

export const getPaletteById = (paletteId: string) =>
  THEME_PALETTES.find((palette) => palette.id === paletteId) ?? THEME_PALETTES[0];
