import * as React from "react";

export type ThemeName = "light" | "dark";

export type ThemeTokens = {
  color: {
    canvas: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textInverse: string;
    primary: string;
    primaryHover: string;
    focusRing: string;
    danger: string;
    overlay: string;
  };
  spacing: {
    xxs: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    familySans: string;
    familyMono: string;
    sizeSm: string;
    sizeMd: string;
    sizeLg: string;
    sizeXl: string;
    weightRegular: number;
    weightMedium: number;
    weightBold: number;
    lineHeightTight: number;
    lineHeightBase: number;
  };
  radius: {
    sm: string;
    md: string;
    pill: string;
  };
  shadow: {
    card: string;
    modal: string;
  };
};

export const themeTokens: Record<ThemeName, ThemeTokens> = {
  light: {
    color: {
      canvas: "#f4f7fb",
      surface: "#ffffff",
      surfaceElevated: "#ffffff",
      border: "#c7d2e0",
      borderStrong: "#7a8aa0",
      text: "#102033",
      textMuted: "#465569",
      textInverse: "#f8fbff",
      primary: "#0059c7",
      primaryHover: "#00439a",
      focusRing: "#ffb000",
      danger: "#b42318",
      overlay: "rgba(8, 15, 30, 0.72)"
    },
    spacing: {
      xxs: "0.25rem",
      xs: "0.5rem",
      sm: "0.75rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem"
    },
    typography: {
      familySans: "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
      familyMono: "\"IBM Plex Mono\", monospace",
      sizeSm: "0.875rem",
      sizeMd: "1rem",
      sizeLg: "1.125rem",
      sizeXl: "1.5rem",
      weightRegular: 400,
      weightMedium: 500,
      weightBold: 700,
      lineHeightTight: 1.2,
      lineHeightBase: 1.5
    },
    radius: {
      sm: "0.5rem",
      md: "0.875rem",
      pill: "999px"
    },
    shadow: {
      card: "0 12px 28px rgba(16, 32, 51, 0.08)",
      modal: "0 24px 64px rgba(8, 15, 30, 0.28)"
    }
  },
  dark: {
    color: {
      canvas: "#08111e",
      surface: "#102033",
      surfaceElevated: "#16293d",
      border: "#30465f",
      borderStrong: "#8da4bf",
      text: "#f4f8fc",
      textMuted: "#bfd0e0",
      textInverse: "#08111e",
      primary: "#70b5ff",
      primaryHover: "#9acbff",
      focusRing: "#ffd166",
      danger: "#ff8a80",
      overlay: "rgba(2, 6, 14, 0.82)"
    },
    spacing: {
      xxs: "0.25rem",
      xs: "0.5rem",
      sm: "0.75rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem"
    },
    typography: {
      familySans: "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
      familyMono: "\"IBM Plex Mono\", monospace",
      sizeSm: "0.875rem",
      sizeMd: "1rem",
      sizeLg: "1.125rem",
      sizeXl: "1.5rem",
      weightRegular: 400,
      weightMedium: 500,
      weightBold: 700,
      lineHeightTight: 1.2,
      lineHeightBase: 1.5
    },
    radius: {
      sm: "0.5rem",
      md: "0.875rem",
      pill: "999px"
    },
    shadow: {
      card: "0 18px 40px rgba(0, 0, 0, 0.35)",
      modal: "0 28px 80px rgba(0, 0, 0, 0.5)"
    }
  }
};

const cssVarMap = (tokens: ThemeTokens): Record<string, string | number> => ({
  "--ds-color-canvas": tokens.color.canvas,
  "--ds-color-surface": tokens.color.surface,
  "--ds-color-surface-elevated": tokens.color.surfaceElevated,
  "--ds-color-border": tokens.color.border,
  "--ds-color-border-strong": tokens.color.borderStrong,
  "--ds-color-text": tokens.color.text,
  "--ds-color-text-muted": tokens.color.textMuted,
  "--ds-color-text-inverse": tokens.color.textInverse,
  "--ds-color-primary": tokens.color.primary,
  "--ds-color-primary-hover": tokens.color.primaryHover,
  "--ds-color-focus-ring": tokens.color.focusRing,
  "--ds-color-danger": tokens.color.danger,
  "--ds-color-overlay": tokens.color.overlay,
  "--ds-space-xxs": tokens.spacing.xxs,
  "--ds-space-xs": tokens.spacing.xs,
  "--ds-space-sm": tokens.spacing.sm,
  "--ds-space-md": tokens.spacing.md,
  "--ds-space-lg": tokens.spacing.lg,
  "--ds-space-xl": tokens.spacing.xl,
  "--ds-font-family-sans": tokens.typography.familySans,
  "--ds-font-family-mono": tokens.typography.familyMono,
  "--ds-font-size-sm": tokens.typography.sizeSm,
  "--ds-font-size-md": tokens.typography.sizeMd,
  "--ds-font-size-lg": tokens.typography.sizeLg,
  "--ds-font-size-xl": tokens.typography.sizeXl,
  "--ds-font-weight-regular": tokens.typography.weightRegular,
  "--ds-font-weight-medium": tokens.typography.weightMedium,
  "--ds-font-weight-bold": tokens.typography.weightBold,
  "--ds-line-height-tight": tokens.typography.lineHeightTight,
  "--ds-line-height-base": tokens.typography.lineHeightBase,
  "--ds-radius-sm": tokens.radius.sm,
  "--ds-radius-md": tokens.radius.md,
  "--ds-radius-pill": tokens.radius.pill,
  "--ds-shadow-card": tokens.shadow.card,
  "--ds-shadow-modal": tokens.shadow.modal
});

export const tokensToCss = (theme: ThemeName): string => {
  const vars = Object.entries(cssVarMap(themeTokens[theme]))
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");

  return `[data-illuvrse-theme="${theme}"] {\n${vars}\n}`;
};

export const designSystemStyles = `
:root {
  color-scheme: light dark;
}

${tokensToCss("light")}
${tokensToCss("dark")}

[data-illuvrse-theme] {
  background: var(--ds-color-canvas);
  color: var(--ds-color-text);
  font-family: var(--ds-font-family-sans);
}

.ds-shell {
  background: var(--ds-color-canvas);
  color: var(--ds-color-text);
}

.ds-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-xs);
  min-height: 2.75rem;
  padding: 0 var(--ds-space-md);
  border: 1px solid transparent;
  border-radius: var(--ds-radius-pill);
  font: inherit;
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-tight);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.ds-button:focus-visible,
.ds-input:focus-visible,
.ds-nav-link:focus-visible,
.ds-modal-close:focus-visible,
.ds-theme-toggle:focus-visible {
  outline: 3px solid var(--ds-color-focus-ring);
  outline-offset: 2px;
}

.ds-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ds-button-primary {
  background: var(--ds-color-primary);
  color: var(--ds-color-text-inverse);
}

.ds-button-primary:hover:not(:disabled) {
  background: var(--ds-color-primary-hover);
}

.ds-button-secondary {
  background: var(--ds-color-surface);
  border-color: var(--ds-color-border-strong);
  color: var(--ds-color-text);
}

.ds-field {
  display: grid;
  gap: var(--ds-space-xs);
}

.ds-label {
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-bold);
}

.ds-input {
  min-height: 2.75rem;
  width: 100%;
  padding: 0 var(--ds-space-md);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-surface);
  color: var(--ds-color-text);
  font: inherit;
  box-sizing: border-box;
}

.ds-input[aria-invalid="true"] {
  border-color: var(--ds-color-danger);
}

.ds-help {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-text-muted);
}

.ds-error {
  font-size: var(--ds-font-size-sm);
  color: var(--ds-color-danger);
}

.ds-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-xs);
}

.ds-nav-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.ds-nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  padding: 0 var(--ds-space-md);
  border-radius: var(--ds-radius-pill);
  color: var(--ds-color-text);
  text-decoration: none;
}

.ds-nav-link[aria-current="page"] {
  background: var(--ds-color-surface-elevated);
  box-shadow: inset 0 0 0 1px var(--ds-color-border-strong);
  font-weight: var(--ds-font-weight-bold);
}

.ds-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--ds-space-lg);
  background: var(--ds-color-overlay);
}

.ds-modal {
  width: min(32rem, 100%);
  max-height: calc(100vh - 3rem);
  overflow: auto;
  padding: var(--ds-space-lg);
  border-radius: calc(var(--ds-radius-md) * 1.25);
  background: var(--ds-color-surface-elevated);
  box-shadow: var(--ds-shadow-modal);
}

.ds-modal-header {
  display: flex;
  justify-content: space-between;
  gap: var(--ds-space-md);
  align-items: start;
}

.ds-modal-title {
  margin: 0;
  font-size: var(--ds-font-size-xl);
  line-height: var(--ds-line-height-tight);
}

.ds-modal-body {
  margin-top: var(--ds-space-md);
}

.ds-modal-close,
.ds-theme-toggle {
  min-height: 2.5rem;
  padding: 0 var(--ds-space-md);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-pill);
  background: var(--ds-color-surface);
  color: var(--ds-color-text);
  font: inherit;
  cursor: pointer;
}

.ds-theme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-sm);
}
`;

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "illuvrse-design-system-theme"
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
}) {
  const [theme, setThemeState] = React.useState<ThemeName>(defaultTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    const stored = window.localStorage.getItem(storageKey);
    const nextTheme = stored === "light" || stored === "dark" ? stored : defaultTheme;
    root.setAttribute("data-illuvrse-theme", nextTheme);
    setThemeState(nextTheme);
  }, [defaultTheme, storageKey]);

  const setTheme = React.useCallback(
    (nextTheme: ThemeName) => {
      document.documentElement.setAttribute("data-illuvrse-theme", nextTheme);
      window.localStorage.setItem(storageKey, nextTheme);
      setThemeState(nextTheme);
    },
    [storageKey]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "light" ? "dark" : "light")
    }),
    [setTheme, theme]
  );

  return (
    React.createElement(
      ThemeContext.Provider,
      { value },
      React.createElement("style", null, designSystemStyles),
      React.createElement("div", { className: "ds-shell", "data-illuvrse-theme": theme }, children)
    )
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return React.createElement(
    "button",
    {
      className: "ds-theme-toggle",
      type: "button",
      "aria-label": `Switch to ${theme === "light" ? "dark" : "light"} theme`,
      onClick: toggleTheme
    },
    `Theme: ${theme}`
  );
}
