/**
 * Edit show page.
 * Data: GET /api/admin/shows/[id] -> show, PUT /api/admin/shows/[id] -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ShowForm, { type ShowFormValues } from "@/components/admin/ShowForm";

type ShowResponse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  posterUrl: string | null;
  heroUrl: string | null;
  featured: boolean;
  trending: boolean;
  newRelease: boolean;
  heroPriority: number | null;
  featuredRail: string | null;
  featuredRailOrder: number | null;
  watchOrder: number | null;
  maturityRating: string | null;
  isPremium: boolean;
  price: number | null;
  genres: string[];
  tags: string[];
  cast: string[];
};

export default function EditShowPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params?.id as string;
  const [show, setShow] = useState<ShowResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/shows/${showId}`)
      .then((res) => res.json())
      .then((data) => setShow(data))
      .finally(() => setLoading(false));
  }, [showId]);

  const handleSubmit = async (values: ShowFormValues) => {
    const res = await fetch(`/api/admin/shows/${showId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(payload.error ?? "Failed to update show.");
    }

    router.push("/admin/shows");
  };

  if (loading) {
    return <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>;
  }

  if (!show) {
    return <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Show not found.</div>;
  }

  return (
    <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
      <h2 className="text-xl font-semibold">Edit Show</h2>
      <p className="text-sm text-illuvrse-muted">Update metadata and assets.</p>
      <div className="mt-6">
        <ShowForm
          initialValues={{
            title: show.title,
            slug: show.slug,
            description: show.description ?? "",
            posterUrl: show.posterUrl ?? "",
            heroUrl: show.heroUrl ?? "",
            featured: show.featured,
            trending: show.trending,
            newRelease: show.newRelease,
            heroPriority: show.heroPriority,
            featuredRail: show.featuredRail ?? "",
            featuredRailOrder: show.featuredRailOrder,
            watchOrder: show.watchOrder,
            maturityRating: show.maturityRating ?? "",
            isPremium: show.isPremium,
            price: show.price,
            genres: show.genres ?? [],
            tags: show.tags ?? [],
            cast: show.cast ?? []
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
