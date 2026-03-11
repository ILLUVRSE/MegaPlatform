/**
 * Custom admin sign-in page.
 * Uses NextAuth Credentials provider: signIn("credentials", { email }).
 */
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/watch";
  const [email, setEmail] = useState("admin@illuvrse.local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      callbackUrl,
      redirect: true
    });

    if (res?.error) {
      setError("Unable to sign in. Check the email address.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-illuvrse-bg text-illuvrse-text">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">ILLUVRSE</p>
          <h1 className="text-3xl font-semibold">Sign In</h1>
          <p className="text-sm text-illuvrse-muted">Use your email to continue.</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card"
        >
          <label className="space-y-1 text-sm font-semibold">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
              required
            />
          </label>
          {error ? <p className="mt-3 text-sm text-illuvrse-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-xs text-illuvrse-muted">
          Seeded accounts: admin@illuvrse.local and user@illuvrse.local
        </p>
      </div>
    </div>
  );
}
