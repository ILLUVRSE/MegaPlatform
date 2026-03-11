import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function Tag({ children, active = false, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        active
          ? 'border-river bg-river text-white'
          : 'border-ink/20 bg-white text-ink/80 dark:border-white/20 dark:bg-slate dark:text-white/90',
        className
      )}
    >
      {children}
    </span>
  );
}
