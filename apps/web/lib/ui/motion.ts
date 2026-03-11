export const MOTION_CLASS = {
  enterFadeUp: "motion-safe:animate-illuvrse-fade-up motion-reduce:animate-none",
  enterFade: "motion-safe:animate-illuvrse-fade motion-reduce:animate-none",
  hoverLift: "transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
  pressScale: "transition-transform duration-150 ease-out motion-safe:active:scale-[0.98] motion-reduce:active:scale-100"
} as const;
