'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';

interface ToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function Toast({ open, message, onClose }: ToastProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [onClose, open]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-5 right-5 z-50 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg transition duration-200 dark:bg-white dark:text-ink',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      )}
    >
      {message}
    </div>
  );
}
