import './globals.css';
import { ReactNode } from 'react';
import { EmbedShell } from '../components/EmbedShell';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EmbedShell>{children}</EmbedShell>
      </body>
    </html>
  );
}
