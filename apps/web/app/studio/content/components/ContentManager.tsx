"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ContentAsset = {
  id: string;
  kind: "VIDEO" | "THUMBNAIL" | "AUDIO";
  url: string;
  storageKey?: string | null;
};

type ContentItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  state: "DRAFT" | "PROCESSING" | "REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  assets: ContentAsset[];
};

type Props = {
  initialItems: ContentItem[];
};

export default function ContentManager({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    if (initialItems.length > 0 && !selectedId) {
      setSelectedId(initialItems[0].id);
    }
  }, [initialItems, selectedId]);

  const refresh = async () => {
    const response = await fetch("/api/studio/content", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { items: ContentItem[] };
    setItems(payload.items ?? []);
  };

  const updateMetadata = async (payload: { title: string; description: string | null }) => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/studio/content/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Failed to update" }));
      setMessage(body.error ?? "Failed to update");
      return;
    }
    setMessage("Metadata saved.");
    await refresh();
    router.refresh();
  };

  const transition = async (
    action: "request-publish" | "publish" | "reject",
    reason?: string
  ) => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/studio/content/${selected.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });

    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Transition failed" }));
      setMessage(body.error ?? "Transition failed");
      return;
    }

    setMessage(`Transition ${action} completed.`);
    await refresh();
    router.refresh();
  };

  const createDraft = async () => {
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/studio/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SHORT", title: "Untitled Content", description: "" })
    });

    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Failed to create draft" }));
      setMessage(body.error ?? "Failed to create draft");
      return;
    }

    const body = (await response.json()) as { content: ContentItem };
    setSelectedId(body.content.id);
    await refresh();
    router.refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <section className="party-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Drafts</h2>
          <button className="party-button" onClick={createDraft} disabled={busy}>
            New Draft
          </button>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-illuvrse-muted">No content items yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                data-testid={`content-row-${item.id}`}
                className={`w-full rounded-xl border px-3 py-2 text-left ${
                  selectedId === item.id ? "border-illuvrse-primary bg-illuvrse-primary/10" : "border-illuvrse-border"
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">{item.state}</p>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-illuvrse-muted">{item.type}</p>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="party-card space-y-4" data-testid="content-detail">
        {selected ? (
          <ContentEditor
            key={selected.id}
            item={selected}
            busy={busy}
            onSave={updateMetadata}
            onTransition={transition}
          />
        ) : (
          <p className="text-sm text-illuvrse-muted">Select a content item.</p>
        )}
        {message ? <p className="text-sm text-illuvrse-muted">{message}</p> : null}
      </section>
    </div>
  );
}

function ContentEditor({
  item,
  busy,
  onSave,
  onTransition
}: {
  item: ContentItem;
  busy: boolean;
  onSave: (payload: { title: string; description: string | null }) => Promise<void>;
  onTransition: (action: "request-publish" | "publish" | "reject", reason?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">{item.id}</p>
        <h3 className="text-2xl font-semibold">{item.title}</h3>
      </div>

      <label className="block text-sm font-semibold">
        Title
        <input
          className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-3 py-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="block text-sm font-semibold">
        Description
        <textarea
          className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-3 py-2"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button className="party-button" disabled={busy} onClick={() => onSave({ title, description: description || null })}>
          Save
        </button>
        <button className="party-button" disabled={busy} onClick={() => onTransition("request-publish")}>Request Publish</button>
        <button className="party-button" disabled={busy} onClick={() => onTransition("publish")}>Publish</button>
        <button className="party-button" disabled={busy} onClick={() => onTransition("reject", "Rejected from studio content page")}>Reject</button>
      </div>

      <div>
        <p className="text-sm font-semibold">Assets</p>
        {item.assets.length === 0 ? (
          <p className="text-sm text-illuvrse-muted">No assets attached.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {item.assets.map((asset) => (
              <li key={asset.id}>{asset.kind}: {asset.url}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
