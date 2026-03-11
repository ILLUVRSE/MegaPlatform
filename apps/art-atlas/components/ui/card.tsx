import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink/10 bg-white shadow-card dark:border-white/10 dark:bg-slate/80',
        className
      )}
      {...props}
    />
  );
}
