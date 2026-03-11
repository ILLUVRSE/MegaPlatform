import { cn } from '@/lib/cn';
import type { SelectHTMLAttributes } from 'react';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river dark:border-white/20 dark:bg-slate dark:text-white',
        className
      )}
      {...props}
    />
  );
}
