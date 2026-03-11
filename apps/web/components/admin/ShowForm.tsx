"use client";

import { useState } from "react";
import { z } from "zod";

const showSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  posterUrl: z.string().url().optional().or(z.literal("")),
  heroUrl: z.string().url().optional().or(z.literal("")),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  newRelease: z.boolean().default(false),
  heroPriority: z.number().int().optional().nullable(),
  featuredRail: z.string().optional().nullable(),
  featuredRailOrder: z.number().int().optional().nullable(),
  watchOrder: z.number().int().optional().nullable(),
  maturityRating: z.string().optional().nullable(),
  isPremium: z.boolean().default(false),
  price: z.number().int().min(0).optional().nullable(),
  genres: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  cast: z.array(z.string()).default([])
});

export type ShowFormValues = z.infer<typeof showSchema>;

export default function ShowForm({
  initialValues,
  onSubmit
}: {
  initialValues?: Partial<ShowFormValues>;
  onSubmit: (values: ShowFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ShowFormValues>({
    title: initialValues?.title ?? "",
    slug: initialValues?.slug ?? "",
    description: initialValues?.description ?? "",
    posterUrl: initialValues?.posterUrl ?? "",
    heroUrl: initialValues?.heroUrl ?? "",
    featured: initialValues?.featured ?? false,
    trending: initialValues?.trending ?? false,
    newRelease: initialValues?.newRelease ?? false,
    heroPriority: initialValues?.heroPriority ?? null,
    featuredRail: initialValues?.featuredRail ?? "",
    featuredRailOrder: initialValues?.featuredRailOrder ?? null,
    watchOrder: initialValues?.watchOrder ?? null,
    maturityRating: initialValues?.maturityRating ?? "",
    isPremium: initialValues?.isPremium ?? false,
    price: initialValues?.price ?? null,
    genres: initialValues?.genres ?? [],
    tags: initialValues?.tags ?? [],
    cast: initialValues?.cast ?? []
  });
  const [genresInput, setGenresInput] = useState((initialValues?.genres ?? []).join(", "));
  const [tagsInput, setTagsInput] = useState((initialValues?.tags ?? []).join(", "));
  const [castInput, setCastInput] = useState((initialValues?.cast ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (
    field: keyof ShowFormValues,
    value: string | boolean | number | null | string[]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value as never }));
  };

  const parseCsv = (raw: string) =>
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      ...values,
      featuredRail: values.featuredRail?.trim() ? values.featuredRail : null,
      maturityRating: values.maturityRating?.trim() ? values.maturityRating : null,
      genres: parseCsv(genresInput),
      tags: parseCsv(tagsInput),
      cast: parseCsv(castInput)
    };
    const parsed = showSchema.safeParse(payload);
    if (!parsed.success) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save show.");
    } finally {
      setSaving(false);
    }
  };

  const handleStubUpload = (field: "posterUrl" | "heroUrl") => {
    const placeholder = field === "posterUrl"
      ? "https://placehold.co/420x600?text=Show+Poster"
      : "https://placehold.co/1200x500?text=Show+Hero";
    handleChange(field, placeholder);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Title
          <input
            type="text"
            value={values.title}
            onChange={(event) => handleChange("title", event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            required
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Slug
          <input
            type="text"
            value={values.slug}
            onChange={(event) => handleChange("slug", event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            required
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={values.isPremium}
            onChange={(event) => handleChange("isPremium", event.target.checked)}
          />
          Premium Watch Content
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Premium Price (cents)
          <input
            type="number"
            value={values.price ?? ""}
            onChange={(event) =>
              handleChange("price", event.target.value ? Number(event.target.value) : null)
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            disabled={!values.isPremium}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(event) => handleChange("featured", event.target.checked)}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={values.trending}
            onChange={(event) => handleChange("trending", event.target.checked)}
          />
          Trending
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={values.newRelease}
            onChange={(event) => handleChange("newRelease", event.target.checked)}
          />
          New Release
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold">
          Hero Priority
          <input
            type="number"
            value={values.heroPriority ?? ""}
            onChange={(event) =>
              handleChange("heroPriority", event.target.value ? Number(event.target.value) : null)
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Watch Order
          <input
            type="number"
            value={values.watchOrder ?? ""}
            onChange={(event) =>
              handleChange("watchOrder", event.target.value ? Number(event.target.value) : null)
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Featured Rail Order
          <input
            type="number"
            value={values.featuredRailOrder ?? ""}
            onChange={(event) =>
              handleChange(
                "featuredRailOrder",
                event.target.value ? Number(event.target.value) : null
              )
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Featured Rail Key
          <input
            type="text"
            value={values.featuredRail ?? ""}
            onChange={(event) => handleChange("featuredRail", event.target.value)}
            placeholder="e.g. EDITOR_PICKS"
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Maturity Rating
          <input
            type="text"
            value={values.maturityRating ?? ""}
            onChange={(event) => handleChange("maturityRating", event.target.value)}
            placeholder="TV-14"
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold">
          Genres (comma separated)
          <input
            type="text"
            value={genresInput}
            onChange={(event) => setGenresInput(event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Tags (comma separated)
          <input
            type="text"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Cast (comma separated)
          <input
            type="text"
            value={castInput}
            onChange={(event) => setCastInput(event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
      </div>
      <label className="space-y-1 text-sm font-semibold">
        Description
        <textarea
          value={values.description}
          onChange={(event) => handleChange("description", event.target.value)}
          className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          rows={4}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Poster URL
          <input
            type="url"
            value={values.posterUrl}
            onChange={(event) => handleChange("posterUrl", event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
          <button
            type="button"
            onClick={() => handleStubUpload("posterUrl")}
            className="text-xs text-illuvrse-primary"
          >
            Generate placeholder
          </button>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Hero URL
          <input
            type="url"
            value={values.heroUrl}
            onChange={(event) => handleChange("heroUrl", event.target.value)}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
          <button
            type="button"
            onClick={() => handleStubUpload("heroUrl")}
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
        {saving ? "Saving..." : "Save Show"}
      </button>
      <p className="text-xs text-illuvrse-muted">
        TODO: Replace placeholder upload with S3 signed upload flow.
      </p>
    </form>
  );
}
