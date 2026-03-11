/**
 * Profile card.
 */
"use client";

export default function ProfileCard({
  profile,
  onSelect
}: {
  profile: { id: string; name: string; avatarUrl?: string | null; isKids: boolean };
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(profile.id)}
      className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white hover:border-white/40"
    >
      <img
        src={profile.avatarUrl ?? "https://placehold.co/120x120?text=User"}
        alt=""
        className="h-20 w-20 rounded-2xl object-cover"
      />
      <div className="text-center">
        <p className="text-sm font-semibold">{profile.name}</p>
        {profile.isKids ? <p className="text-xs text-white/60">Kids</p> : null}
      </div>
    </button>
  );
}
