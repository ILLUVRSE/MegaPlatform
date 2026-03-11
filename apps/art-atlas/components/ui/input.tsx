import { cn } from '@/lib/cn';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river dark:border-white/20 dark:bg-slate dark:text-white dark:placeholder:text-white/50',
        className
      )}
      {...props}
    />
  );
}
