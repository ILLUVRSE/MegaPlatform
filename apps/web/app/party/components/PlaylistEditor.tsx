/**
 * Playlist editor for party hosts.
 * Request/response: manages playlist order and persists via playlist API.
 * Guard: client component.
 */
"use client";

import { useEffect, useState } from "react";
import MediaPickerModal, { type MediaEpisode } from "./MediaPickerModal";

export type PlaylistDraftItem = {
  episodeId: string;
  title: string;
  assetUrl: string;
};

type PlaylistEditorProps = {
  code?: string;
  initialItems?: PlaylistDraftItem[];
  onChange?: (items: PlaylistDraftItem[]) => void;
};

export default function PlaylistEditor({ code, initialItems, onChange }: PlaylistEditorProps) {
  const [items, setItems] = useState<PlaylistDraftItem[]>(initialItems ?? []);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      const response = await fetch(`/api/party/${code}/playlist`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        items: { episodeId: string; order: number; episode: { title: string; assetUrl: string } }[];
      };
      const next = payload.items.map((item) => ({
        episodeId: item.episodeId,
        title: item.episode.title,
        assetUrl: item.episode.assetUrl
      }));
      setItems(next);
    };
    void load();
  }, [code]);

  useEffect(() => {
    if (code) return;
    setItems(initialItems ?? []);
  }, [code, initialItems]);

  useEffect(() => {
    if (onChange) onChange(items);
  }, [items, onChange]);

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const [removed] = next.splice(index, 1);
      next.splice(target, 0, removed);
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAdd = (episode: MediaEpisode) => {
    setItems((prev) => {
      if (prev.some((item) => item.episodeId === episode.id)) return prev;
      return [
        ...prev,
        {
          episodeId: episode.id,
          title: episode.title,
          assetUrl: episode.assetUrl
        }
      ];
    });
  };

  const save = async () => {
    if (!code) {
      setError("Party code required to save playlist.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/party/${code}/playlist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item, index) => ({
          episodeId: item.episodeId,
          order: index
        }))
      })
    });
    if (!response.ok) {
      setError("Unable to save playlist.");
    }
    setSaving(false);
  };

  const hasSave = Boolean(code);
  const saveLabel = saving ? "Saving..." : "Save playlist";

  return (
    <div className="party-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Playlist</p>
          <h3 className="text-xl font-semibold">Episode Queue</h3>
        </div>
        <button
          type="button"
          className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          onClick={() => setOpen(true)}
          data-testid="open-media-picker"
        >
          Add Media
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-illuvrse-muted">No episodes selected yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.episodeId}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-illuvrse-border px-4 py-3"
              data-testid={`playlist-item-${index}`}
            >
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-illuvrse-muted">{item.assetUrl}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                  onClick={() => moveItem(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                  onClick={() => moveItem(index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                  onClick={() => removeItem(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}

      {hasSave ? (
        <button
          type="button"
          className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
          onClick={save}
          disabled={saving}
          data-testid="playlist-save"
        >
          {saveLabel}
        </button>
      ) : null}

      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onAdd={(episode) => {
          handleAdd(episode);
        }}
      />
    </div>
  );
}
