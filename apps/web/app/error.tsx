/**
 * Global error boundary UI.
 * Request/response: renders fallback error view.
 * Guard: client component for error handling.
 */
"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="party-card space-y-3">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-illuvrse-muted">{error.message}</p>
    </div>
  );
}
