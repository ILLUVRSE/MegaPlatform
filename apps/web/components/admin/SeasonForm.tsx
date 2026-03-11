"use client";

import { useState } from "react";
import { z } from "zod";

const seasonSchema = z.object({
  showId: z.string().min(1),
  number: z.number().int().min(1),
  title: z.string().min(2)
});

export type SeasonFormValues = z.infer<typeof seasonSchema>;

export default function SeasonForm({
  shows,
  initialValues,
  onSubmit
}: {
  shows: { id: string; title: string }[];
  initialValues?: Partial<SeasonFormValues>;
  onSubmit: (values: SeasonFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SeasonFormValues>({
    showId: initialValues?.showId ?? (shows[0]?.id ?? ""),
    number: initialValues?.number ?? 1,
    title: initialValues?.title ?? ""
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = seasonSchema.safeParse(values);
    if (!parsed.success) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save season.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="space-y-1 text-sm font-semibold">
        Show
        <select
          value={values.showId}
          onChange={(event) => setValues((prev) => ({ ...prev, showId: event.target.value }))}
          className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          required
        >
          {shows.map((show) => (
            <option key={show.id} value={show.id}>
              {show.title}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Season Number
          <input
            type="number"
            value={values.number}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, number: Number(event.target.value) }))
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            min={1}
            required
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Title
          <input
            type="text"
            value={values.title}
            onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            required
          />
        </label>
      </div>
      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        {saving ? "Saving..." : "Save Season"}
      </button>
    </form>
  );
}
