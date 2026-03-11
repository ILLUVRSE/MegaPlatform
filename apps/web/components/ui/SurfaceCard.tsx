import type { ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "dark";
};

const toneClass: Record<NonNullable<SurfaceCardProps["tone"]>, string> = {
  default: "border border-illuvrse-border bg-white shadow-card",
  muted: "border border-illuvrse-border bg-illuvrse-bg shadow-card",
  dark: "border border-white/15 bg-black/30 text-white shadow-card"
};

export default function SurfaceCard({ children, className = "", tone = "default" }: SurfaceCardProps) {
  return <div className={`overflow-hidden rounded-2xl ${toneClass[tone]} ${className}`.trim()}>{children}</div>;
}
