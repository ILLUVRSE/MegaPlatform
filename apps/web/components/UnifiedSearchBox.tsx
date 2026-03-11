"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SearchResult = {
  id: string;
  kind: string;
  title: string;
  href: string;
  summary: string;
};

export default function UnifiedSearchBox() {
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
    <div className="relative hidden min-w-[260px] lg:block" data-testid="unified-search-box">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search across ILLUVRSE"
        className="w-full rounded-full border border-illuvrse-border bg-white px-4 py-2 text-sm"
      />
      {results.length > 0 ? (
        <div className="absolute left-0 right-0 top-12 z-20 rounded-3xl border border-illuvrse-border bg-white p-3 shadow-card">
          {results.slice(0, 6).map((result) => (
            <Link key={result.id} href={result.href} className="block rounded-2xl px-3 py-2 hover:bg-illuvrse-primary/5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-illuvrse-muted">{result.kind}</p>
              <p className="text-sm font-semibold text-illuvrse-text">{result.title}</p>
              <p className="text-sm text-illuvrse-muted">{result.summary}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
