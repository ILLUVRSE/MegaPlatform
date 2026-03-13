/**
 * Join party form for navigating to a party code.
 * Request/response: redirects to /party/{code} on submit.
 * Guard: client component; requires router.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinPartyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const inputId = "join-party-code";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    router.push(`/party/${cleaned}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3" aria-label="Join a party by code">
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-[0.24em] text-white/82">
          Party code
        </label>
      <input
        id={inputId}
        className="interactive-focus w-44 rounded-full border border-illuvrse-border bg-white px-4 py-2 text-sm text-slate-950"
        placeholder="Enter code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoComplete="off"
      />
      </div>
      <button
        type="submit"
        className="interactive-focus rounded-full border border-illuvrse-border px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white"
      >
        Join With Code
      </button>
    </form>
  );
}
