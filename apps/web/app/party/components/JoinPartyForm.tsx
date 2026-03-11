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

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    router.push(`/party/${cleaned}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-3">
      <input
        className="w-44 rounded-full border border-illuvrse-border bg-white px-4 py-2 text-sm"
        placeholder="Enter code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <button
        type="submit"
        className="rounded-full border border-illuvrse-border px-5 py-2 text-xs font-semibold uppercase tracking-widest"
      >
        Join With Code
      </button>
    </form>
  );
}
