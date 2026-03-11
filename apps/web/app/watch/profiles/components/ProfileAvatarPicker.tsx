"use client";

const AVATARS = [
  "https://placehold.co/120x120?text=A",
  "https://placehold.co/120x120?text=B",
  "https://placehold.co/120x120?text=C",
  "https://placehold.co/120x120?text=D"
];

export default function ProfileAvatarPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (avatarUrl: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Choose avatar</p>
      <div className="flex flex-wrap gap-3">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            className={`rounded-2xl border ${value === avatar ? "border-white" : "border-white/20"}`}
            onClick={() => onChange(avatar)}
          >
            <img src={avatar} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export const DEFAULT_PROFILE_AVATAR = AVATARS[0];
