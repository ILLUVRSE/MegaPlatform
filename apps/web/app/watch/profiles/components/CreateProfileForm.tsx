/**
 * Create profile form.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";
import ProfileAvatarPicker, { DEFAULT_PROFILE_AVATAR } from "./ProfileAvatarPicker";

export default function CreateProfileForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isKids, setIsKids] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_PROFILE_AVATAR);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("Creating...");
    const response = await fetch("/api/watch/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatarUrl, isKids })
    });
    if (!response.ok) {
      setStatus("Unable to create profile.");
      return;
    }
    const payload = (await response.json()) as { profile: { id: string } };
    document.cookie = `${PROFILE_COOKIE}=${payload.profile.id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push("/watch");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-white">
        Profile name
        <input
          className="mt-2 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-sm text-white"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter name"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={isKids} onChange={(event) => setIsKids(event.target.checked)} />
        Kids profile
      </label>
      <ProfileAvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-full bg-white px-6 py-2 text-xs font-semibold uppercase tracking-widest text-black"
        disabled={!name.trim()}
      >
        Create Profile
      </button>
      {status ? <p className="text-sm text-white/60">{status}</p> : null}
    </div>
  );
}
