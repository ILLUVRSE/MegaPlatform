import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import PlatformPageLoadTelemetry from "@/components/PlatformPageLoadTelemetry";

export const metadata: Metadata = {
  title: "ILLUVRSE MegaPlatform",
  description: "The front door to watch, play, and party across the ILLUVRSE MegaPlatform."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-illuvrse-bg text-illuvrse-text antialiased">
        <PlatformPageLoadTelemetry />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
