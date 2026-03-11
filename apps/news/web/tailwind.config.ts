import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif']
      },
      colors: {
        ink: '#0f172a',
        signal: '#fb923c',
        slate: '#1e293b'
      }
    }
  },
  plugins: []
};

export default config;
