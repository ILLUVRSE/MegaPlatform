import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#f3f0e8',
        ink: '#182026',
        bronze: '#9a6a3a',
        river: '#2d5b80',
        pine: '#1f4f46',
        slate: '#111827'
      },
      boxShadow: {
        card: '0 10px 30px rgba(24, 32, 38, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
