import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0D1B2A',
        surf: '#E0E1DD',
        accent: '#F4A261',
        mint: '#84A98C'
      }
    }
  },
  plugins: []
};

export default config;
