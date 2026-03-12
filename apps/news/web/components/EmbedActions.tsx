"use client";

type EmbedActionsProps = {
  storyId: string;
  storyTitle: string;
};

export function EmbedActions({ storyId, storyTitle }: EmbedActionsProps) {
  const targetOrigin = resolveParentOrigin();
  const newsOrigin = typeof window === "undefined" ? "" : window.location.origin;

  const postAction = (type: string, href: string) => {
    if (typeof window === "undefined" || window.parent === window) return;

    window.parent.postMessage({ type, storyId, storyTitle, href }, targetOrigin);
    window.parent.postMessage({ type: "embed_interaction", href }, targetOrigin);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => postAction("open-direct", `${newsOrigin}/cluster/${storyId}`)}
        className="rounded-full bg-[#d7b56d] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-950"
      >
        Open Now
      </button>
      <button
        type="button"
        onClick={() => postAction("join-party", `/party/create?source=news&storyId=${encodeURIComponent(storyId)}`)}
        className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white"
      >
        Join Party
      </button>
      <button
        type="button"
        onClick={() => postAction("open-studio", `/studio?source=news&storyId=${encodeURIComponent(storyId)}`)}
        className="rounded-full border border-[#7fffd4]/40 bg-[#7fffd4]/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#c9fff1]"
      >
        Open Studio
      </button>
    </div>
  );
}

function resolveParentOrigin() {
  if (typeof document === "undefined" || !document.referrer) return "*";

  try {
    return new URL(document.referrer).origin;
  } catch {
    return "*";
  }
}
