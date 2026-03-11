import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-ink text-white hover:bg-river dark:bg-river dark:hover:bg-pine',
        variant === 'secondary' && 'border border-ink/20 bg-white text-ink hover:border-river dark:border-white/25 dark:bg-slate dark:text-white',
        variant === 'ghost' && 'text-ink hover:bg-ink/5 dark:text-white dark:hover:bg-white/10',
        variant === 'danger' && 'bg-red-700 text-white hover:bg-red-800',
        className
      )}
      {...props}
    />
  );
}
