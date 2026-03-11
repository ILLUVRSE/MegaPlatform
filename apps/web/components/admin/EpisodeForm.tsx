"use client";

import { useState } from "react";
import { z } from "zod";

const episodeSchema = z.object({
  seasonId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  lengthSeconds: z.number().int().min(30),
  assetUrl: z.string().url()
});

export type EpisodeFormValues = z.infer<typeof episodeSchema>;

export default function EpisodeForm({
  seasons,
  initialValues,
  onSubmit
}: {
  seasons: { id: string; title: string; showTitle: string }[];
  initialValues?: Partial<EpisodeFormValues>;
  onSubmit: (values: EpisodeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<EpisodeFormValues>({
    seasonId: initialValues?.seasonId ?? (seasons[0]?.id ?? ""),
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    lengthSeconds: initialValues?.lengthSeconds ?? 1200,
    assetUrl: initialValues?.assetUrl ?? ""
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = episodeSchema.safeParse(values);
    if (!parsed.success) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save episode.");
    } finally {
      setSaving(false);
    }
  };

  const handleStubUpload = () => {
    setValues((prev) => ({
      ...prev,
      assetUrl: "https://cdn.illuvrse.dev/assets/placeholder-episode.mp4"
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="space-y-1 text-sm font-semibold">
        Season
        <select
          value={values.seasonId}
          onChange={(event) => setValues((prev) => ({ ...prev, seasonId: event.target.value }))}
          className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          required
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.showTitle} - {season.title}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm font-semibold">
        Episode Title
        <input
          type="text"
          value={values.title}
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          required
        />
      </label>
      <label className="space-y-1 text-sm font-semibold">
        Description
        <textarea
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
          className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          rows={3}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Length (seconds)
          <input
            type="number"
            value={values.lengthSeconds}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, lengthSeconds: Number(event.target.value) }))
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            min={30}
            required
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Asset URL
          <input
            type="url"
            value={values.assetUrl}
            onChange={(event) => setValues((prev) => ({ ...prev, assetUrl: event.target.value }))}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            required
          />
          <button
            type="button"
            onClick={handleStubUpload}
            className="text-xs text-illuvrse-primary"
          >
            Generate placeholder
          </button>
        </label>
      </div>
      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        {saving ? "Saving..." : "Save Episode"}
      </button>
      <p className="text-xs text-illuvrse-muted">
        TODO: Replace placeholder upload with S3 signed upload flow.
      </p>
    </form>
  );
}
