'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const KEY = 'bingham-theme';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem(KEY);
    const enabled = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(enabled);
    root.classList.toggle('dark', enabled);
  }, []);

  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem(KEY, next ? 'dark' : 'light');
      }}
      className="px-3"
    >
      {dark ? 'Light' : 'Dark'}
    </Button>
  );
}
