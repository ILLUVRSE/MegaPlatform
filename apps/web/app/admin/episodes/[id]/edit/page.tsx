/**
 * Edit episode page.
 * Data: GET /api/admin/episodes/[id] -> episode, GET /api/admin/seasons?all=1.
 * Actions: PUT /api/admin/episodes/[id] -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EpisodeForm, { type EpisodeFormValues } from "@/components/admin/EpisodeForm";

type EpisodeResponse = {
  id: string;
  seasonId: string;
  title: string;
  description: string | null;
  lengthSeconds: number;
  assetUrl: string;
};

type SeasonOption = { id: string; title: string; showTitle: string };

export default function EditEpisodePage() {
  const params = useParams();
  const router = useRouter();
  const episodeId = params?.id as string;
  const [episode, setEpisode] = useState<EpisodeResponse | null>(null);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/episodes/${episodeId}`).then((res) => res.json()),
      fetch("/api/admin/seasons?all=1").then((res) => res.json())
    ]).then(([episodePayload, seasonPayload]) => {
      setEpisode(episodePayload);
      setSeasons(seasonPayload.data ?? []);
      setLoading(false);
    });
  }, [episodeId]);

  const handleSubmit = async (values: EpisodeFormValues) => {
    const res = await fetch(`/api/admin/episodes/${episodeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(payload.error ?? "Failed to update episode.");
    }

    router.push("/admin/episodes");
  };

  if (loading) {
    return <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>;
  }

  if (!episode) {
    return <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Episode not found.</div>;
  }

  return (
    <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
      <h2 className="text-xl font-semibold">Edit Episode</h2>
      <p className="text-sm text-illuvrse-muted">Update episode metadata and assets.</p>
      <div className="mt-6">
        <EpisodeForm
          seasons={seasons}
          initialValues={{
            seasonId: episode.seasonId,
            title: episode.title,
            description: episode.description ?? "",
            lengthSeconds: episode.lengthSeconds,
            assetUrl: episode.assetUrl
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
