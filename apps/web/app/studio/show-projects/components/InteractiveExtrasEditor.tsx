"use client";

import { useState } from "react";

type InteractiveExtraRecord = {
  id: string;
  showId: string | null;
  episodeId: string | null;
  type: "POLL" | "CALLOUT";
  title: string;
  payload: Record<string, unknown>;
  publishStatus: "DRAFT" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
};

type Permissions = {
  editExtras: boolean;
};

type Props = {
  scope: { kind: "show"; slug: string } | { kind: "episode"; episodeId: string };
  title: string;
  description: string;
  initialExtras: InteractiveExtraRecord[];
  permissions: Permissions;
};

type ExtraFormState = {
  type: InteractiveExtraRecord["type"];
  title: string;
  publishStatus: InteractiveExtraRecord["publishStatus"];
  pollPrompt: string;
  pollOptions: string;
  calloutBody: string;
  ctaLabel: string;
  ctaUrl: string;
};

function createFormState(extra?: InteractiveExtraRecord): ExtraFormState {
  if (!extra) {
    return {
      type: "POLL",
      title: "",
      publishStatus: "DRAFT",
      pollPrompt: "",
      pollOptions: "Option 1\nOption 2",
      calloutBody: "",
      ctaLabel: "",
      ctaUrl: ""
    };
  }

  if (extra.type === "POLL") {
    const options = Array.isArray(extra.payload.options)
      ? extra.payload.options
          .map((option) =>
            typeof option === "object" && option && "label" in option ? String(option.label ?? "") : ""
          )
          .filter(Boolean)
          .join("\n")
      : "";

    return {
      type: "POLL",
      title: extra.title,
      publishStatus: extra.publishStatus,
      pollPrompt: typeof extra.payload.prompt === "string" ? extra.payload.prompt : "",
      pollOptions: options || "Option 1\nOption 2",
      calloutBody: "",
      ctaLabel: "",
      ctaUrl: ""
    };
  }

  return {
    type: "CALLOUT",
    title: extra.title,
    publishStatus: extra.publishStatus,
    pollPrompt: "",
    pollOptions: "Option 1\nOption 2",
    calloutBody: typeof extra.payload.body === "string" ? extra.payload.body : "",
    ctaLabel: typeof extra.payload.ctaLabel === "string" ? extra.payload.ctaLabel : "",
    ctaUrl: typeof extra.payload.ctaUrl === "string" ? extra.payload.ctaUrl : ""
  };
}

function buildPayload(form: ExtraFormState) {
  if (form.type === "POLL") {
    const options = Array.from(
      new Set(
        form.pollOptions
          .split("\n")
          .map((option) => option.trim())
          .filter(Boolean)
      )
    ).slice(0, 6);

    return {
      prompt: form.pollPrompt.trim() || null,
      options: options.map((label, index) => ({
        id: `option-${index + 1}`,
        label
      }))
    };
  }

  return {
    body: form.calloutBody.trim(),
    ctaLabel: form.ctaLabel.trim() || null,
    ctaUrl: form.ctaUrl.trim() || null
  };
}

function formatType(type: InteractiveExtraRecord["type"]) {
  return type === "POLL" ? "Poll" : "Callout";
}

export default function InteractiveExtrasEditor({
  scope,
  title,
  description,
  initialExtras,
  permissions
}: Props) {
  const [extras, setExtras] = useState(initialExtras);
  const [forms, setForms] = useState<Record<string, ExtraFormState>>(
    Object.fromEntries(initialExtras.map((extra) => [extra.id, createFormState(extra)]))
  );
  const [newForm, setNewForm] = useState<ExtraFormState>(createFormState());
  const [saveTarget, setSaveTarget] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endpoint =
    scope.kind === "show"
      ? `/api/studio/show-projects/${scope.slug}/interactive-extras`
      : `/api/studio/episodes/${scope.episodeId}/interactive-extras`;

  async function handleCreate() {
    setSaveTarget("new");
    setError(null);
    setNotice(null);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: newForm.type,
        title: newForm.title,
        payload: buildPayload(newForm),
        publishStatus: newForm.publishStatus
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      extra?: InteractiveExtraRecord;
    };
    setSaveTarget(null);

    if (!response.ok || !payload.extra) {
      setError(payload.error ?? "Unable to save interactive extra.");
      return;
    }

    setExtras((current) => [payload.extra!, ...current]);
    setForms((current) => ({ ...current, [payload.extra!.id]: createFormState(payload.extra) }));
    setNewForm(createFormState());
    setIsComposerOpen(false);
    setNotice(`Saved interactive extra: ${payload.extra.title}`);
  }

  async function handleSave(extraId: string) {
    const form = forms[extraId];
    if (!form) return;

    setSaveTarget(extraId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/interactive-extras/${extraId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        title: form.title,
        payload: buildPayload(form),
        publishStatus: form.publishStatus
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      extra?: InteractiveExtraRecord;
    };
    setSaveTarget(null);

    if (!response.ok || !payload.extra) {
      setError(payload.error ?? "Unable to update interactive extra.");
      return;
    }

    setExtras((current) => current.map((extra) => (extra.id === payload.extra!.id ? payload.extra! : extra)));
    setForms((current) => ({ ...current, [payload.extra!.id]: createFormState(payload.extra) }));
    setNotice(
      payload.extra.publishStatus === "PUBLISHED"
        ? `Interactive extra is live on Watch: ${payload.extra.title}`
        : `Saved draft interactive extra: ${payload.extra.title}`
    );
  }

  return (
    <section className="party-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Interactive Extras</p>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/70">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsComposerOpen((current) => !current)}
          disabled={!permissions.editExtras}
          className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white disabled:opacity-50"
        >
          {isComposerOpen ? "Close Composer" : "Add Interactive Extra"}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      {isComposerOpen ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <ExtraForm form={newForm} onChange={setNewForm} disabled={!permissions.editExtras || saveTarget === "new"} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!permissions.editExtras || saveTarget === "new"}
              className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
            >
              {saveTarget === "new" ? "Saving" : "Save Interactive Extra"}
            </button>
          </div>
        </div>
      ) : null}

      {extras.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
          No interactive extras yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {extras.map((extra) => {
            const form = forms[extra.id] ?? createFormState(extra);
            return (
              <article key={extra.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">{formatType(extra.type)}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{extra.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
                    {extra.publishStatus}
                  </span>
                </div>
                <ExtraForm
                  form={form}
                  onChange={(next) => setForms((current) => ({ ...current, [extra.id]: next }))}
                  disabled={!permissions.editExtras || saveTarget !== null}
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave(extra.id)}
                    disabled={!permissions.editExtras || saveTarget !== null}
                    className="interactive-focus rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100 disabled:opacity-50"
                  >
                    {saveTarget === extra.id ? "Saving" : "Save Changes"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExtraForm({
  form,
  onChange,
  disabled
}: {
  form: ExtraFormState;
  onChange: (next: ExtraFormState) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-white/55">Type</span>
          <select
            value={form.type}
            onChange={(event) => onChange({ ...form, type: event.target.value as ExtraFormState["type"] })}
            disabled={disabled}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="POLL">Poll</option>
            <option value="CALLOUT">Callout</option>
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-white/55">Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            disabled={disabled}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.2em] text-white/55">Publish status</span>
        <select
          value={form.publishStatus}
          onChange={(event) =>
            onChange({ ...form, publishStatus: event.target.value as ExtraFormState["publishStatus"] })
          }
          disabled={disabled}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </label>

      {form.type === "POLL" ? (
        <div className="grid gap-3">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/55">Prompt</span>
            <input
              type="text"
              value={form.pollPrompt}
              onChange={(event) => onChange({ ...form, pollPrompt: event.target.value })}
              disabled={disabled}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/55">Options</span>
            <textarea
              value={form.pollOptions}
              onChange={(event) => onChange({ ...form, pollOptions: event.target.value })}
              disabled={disabled}
              className="min-h-28 w-full rounded-3xl border border-white/10 bg-slate-950/50 px-4 py-4 text-sm text-white outline-none"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/55">Body</span>
            <textarea
              value={form.calloutBody}
              onChange={(event) => onChange({ ...form, calloutBody: event.target.value })}
              disabled={disabled}
              className="min-h-28 w-full rounded-3xl border border-white/10 bg-slate-950/50 px-4 py-4 text-sm text-white outline-none"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-white/55">CTA label</span>
              <input
                type="text"
                value={form.ctaLabel}
                onChange={(event) => onChange({ ...form, ctaLabel: event.target.value })}
                disabled={disabled}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-white/55">CTA URL</span>
              <input
                type="url"
                value={form.ctaUrl}
                onChange={(event) => onChange({ ...form, ctaUrl: event.target.value })}
                disabled={disabled}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
