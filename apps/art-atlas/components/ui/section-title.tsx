import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export function SectionTitle({ title, subtitle, rightSlot }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-river">Museum Label</p>
        <h2 className="font-[var(--font-serif)] text-3xl font-semibold text-ink dark:text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-ink/75 dark:text-white/75">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </div>
  );
}
