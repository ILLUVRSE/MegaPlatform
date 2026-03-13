"use client";

import { useState } from "react";

type InteractiveExtra = {
  id: string;
  type: "POLL" | "CALLOUT";
  title: string;
  payload: Record<string, unknown>;
};

export default function InteractiveExtrasPanel({
  extras,
  title = "Interactive Extras"
}: {
  extras: InteractiveExtra[];
  title?: string;
}) {
  const [selectedByExtraId, setSelectedByExtraId] = useState<Record<string, string>>({});

  if (extras.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-xs uppercase tracking-[0.24em] text-white/45">Studio authored</span>
      </div>
      <div className="grid gap-3">
        {extras.map((extra) => {
          if (extra.type === "POLL") {
            const options = Array.isArray(extra.payload.options)
              ? extra.payload.options.filter(
                  (option): option is { id: string; label: string } =>
                    typeof option === "object" &&
                    option !== null &&
                    "id" in option &&
                    "label" in option &&
                    typeof option.id === "string" &&
                    typeof option.label === "string"
                )
              : [];
            const selected = selectedByExtraId[extra.id] ?? null;

            return (
              <article key={extra.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Poll</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{extra.title}</h3>
                {typeof extra.payload.prompt === "string" && extra.payload.prompt ? (
                  <p className="mt-2 text-sm text-white/70">{extra.payload.prompt}</p>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {options.map((option) => {
                    const isSelected = selected === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setSelectedByExtraId((current) => ({
                            ...current,
                            [extra.id]: option.id
                          }))
                        }
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          isSelected
                            ? "border-cyan-300/50 bg-cyan-300/12 text-cyan-50"
                            : "border-white/10 bg-slate-950/40 text-white/80"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          }

          const body = typeof extra.payload.body === "string" ? extra.payload.body : "";
          const ctaLabel = typeof extra.payload.ctaLabel === "string" ? extra.payload.ctaLabel : "";
          const ctaUrl = typeof extra.payload.ctaUrl === "string" ? extra.payload.ctaUrl : "";

          return (
            <article key={extra.id} className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">Callout</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{extra.title}</h3>
              <p className="mt-3 text-sm text-white/80">{body}</p>
              {ctaLabel && ctaUrl ? (
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-amber-200/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-50"
                >
                  {ctaLabel}
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
