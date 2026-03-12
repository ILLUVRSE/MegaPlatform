"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

type SearchResult = {
  id: string;
  kind: string;
  title: string;
  href: string;
  summary: string;
};

export default function UnifiedSearchBox() {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/platform/search?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as { results?: SearchResult[] };
      if (!cancelled) {
        setResults(payload.results ?? []);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="relative w-full" data-testid="unified-search-box">
      <label htmlFor={inputId} className="sr-only">
        Search ILLUVRSE
      </label>
      <input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search ILLUVRSE"
        className="w-full rounded-[22px] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-white/38"
      />
      {results.length > 0 ? (
        <div className="absolute left-0 right-0 top-14 z-30 rounded-[28px] border border-white/10 bg-slate-950/96 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          {results.slice(0, 6).map((result) => (
            <Link key={result.id} href={result.href} className="block rounded-2xl px-3 py-3 hover:bg-white/5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/60">{result.kind}</p>
              <p className="text-sm font-semibold text-white">{result.title}</p>
              <p className="text-sm text-white/56">{result.summary}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
