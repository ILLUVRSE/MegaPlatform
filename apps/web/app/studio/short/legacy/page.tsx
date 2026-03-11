/**
 * Legacy short generator page.
 * Request/response: renders job-driven composer for admins.
 * Guard: admin-only.
 */
import ShortComposer from "../components/ShortComposer";
import { requireAdmin } from "@/lib/rbac";

export default async function LegacyShortStudioPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return (
      <div className="party-card space-y-2">
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-sm text-illuvrse-muted">
          The legacy job console is only available to admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">AI Studio</p>
        <h1 className="text-3xl font-semibold">Legacy Short Generator</h1>
        <p className="text-sm text-illuvrse-muted">Admin-only pipeline console.</p>
      </header>
      <ShortComposer />
    </div>
  );
}
