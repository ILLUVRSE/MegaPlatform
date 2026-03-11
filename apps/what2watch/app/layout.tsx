import type { Metadata } from 'next';
import './globals.css';
import { config } from '@/lib/config';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'What2Watch - Live Trending Discovery',
  description: 'Live trend intelligence, swipe discovery, and contextual title feeds.',
  metadataBase: new URL(config.siteUrl)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
