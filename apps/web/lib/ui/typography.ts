export const TYPOGRAPHY_CLASS = {
  eyebrow: "text-[0.68rem] font-semibold uppercase tracking-[0.28em]",
  titleHero: "font-display text-3xl font-bold leading-tight md:text-4xl",
  titleSection: "font-display text-2xl font-semibold leading-tight",
  titleCard: "font-display text-xl font-semibold leading-snug",
  body: "text-sm leading-relaxed text-illuvrse-muted",
  bodyStrong: "text-base font-medium leading-relaxed text-illuvrse-text"
} as const;

export type TypographyKey = keyof typeof TYPOGRAPHY_CLASS;
