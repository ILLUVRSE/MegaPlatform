import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PortalSettings } from '../types';
import { persistence } from './persistence';
import { resolveThemeMode } from './themes';

interface SettingsContextValue {
  settings: PortalSettings;
  updateSettings: (next: Partial<PortalSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readPrefersDark() {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return Boolean(window.matchMedia('(prefers-color-scheme: dark)')?.matches);
  } catch {
    return false;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PortalSettings>(() => persistence.loadSettings());
  const [prefersDark, setPrefersDark] = useState(readPrefersDark);
  const resolvedThemeMode = resolveThemeMode(settings.themeMode, prefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    if (!query) return;
    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handleChange);
      return () => query.removeEventListener('change', handleChange);
    }
    if (typeof query.addListener === 'function') {
      query.addListener(handleChange);
      return () => query.removeListener(handleChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const portalRoot = document.querySelector('.portal-root') as HTMLElement | null;
    const targets: HTMLElement[] = portalRoot ? [root, portalRoot] : [root];
    for (const target of targets) {
      target.dataset.themeMode = resolvedThemeMode;
      target.dataset.themeSkin = settings.themeSkin;
      target.dataset.motion = settings.reducedMotion ? 'reduce' : 'normal';
      target.dataset.contrast = settings.highContrast ? 'high' : 'normal';
      target.dataset.colorVision = settings.colorblindSafe ? 'safe' : 'default';
      target.dataset.uiScale = settings.largeUi ? 'large' : 'normal';
    }
  }, [resolvedThemeMode, settings.colorblindSafe, settings.highContrast, settings.largeUi, settings.reducedMotion, settings.themeSkin]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings: (next) => {
        setSettings((prev) => {
          const merged = { ...prev, ...next };
          persistence.saveSettings(merged);
          return merged;
        });
      }
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
