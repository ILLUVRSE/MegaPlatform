import type { Metadata } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans'
});

const serif = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bingham-atlas.example'),
  title: {
    default: 'Art Atlas',
    template: 'Art Atlas — %s'
  },
  description: 'Comprehensive art app exploring 101 major painters, sculptors, and composers, plus the Bingham collection experience.',
  openGraph: {
    title: 'Art Atlas',
    description: 'Explore a searchable directory of 101 artists alongside curated museum-style collections.',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body className="font-[var(--font-sans)]">
        <a href="#main-content" className="sr-only z-50 rounded-md bg-river px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to main content
        </a>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('bingham-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else if(t==='light'){document.documentElement.classList.remove('dark')}}catch(e){}"
          }}
        />
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
