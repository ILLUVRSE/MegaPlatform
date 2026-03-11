import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "illuvrse-bg": "var(--illuvrse-bg)",
        "illuvrse-surface": "var(--illuvrse-surface)",
        "illuvrse-border": "var(--illuvrse-border)",
        "illuvrse-text": "var(--illuvrse-text)",
        "illuvrse-muted": "var(--illuvrse-muted)",
        "illuvrse-primary": "var(--illuvrse-primary)",
        "illuvrse-accent": "var(--illuvrse-accent)",
        "illuvrse-danger": "var(--illuvrse-danger)",
        "illuvrse-success": "var(--illuvrse-success)"
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 14px 40px rgba(17, 25, 40, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
