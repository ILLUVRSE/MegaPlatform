/**
 * Profile picker grid.
 */
"use client";

import { useRouter } from "next/navigation";
import ProfileCard from "./ProfileCard";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";

export default function ProfilePickerGrid({
  profiles
}: {
  profiles: Array<{ id: string; name: string; avatarUrl?: string | null; isKids: boolean }>;
}) {
  const router = useRouter();

  const handleSelect = (id: string) => {
    document.cookie = `${PROFILE_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push("/watch");
    router.refresh();
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} onSelect={handleSelect} />
      ))}
      <button
        type="button"
        onClick={() => router.push("/watch/profiles/new")}
        className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-white/70 hover:border-white/50"
      >
        <span className="text-2xl">+</span>
        <span className="text-sm font-semibold">Add Profile</span>
      </button>
    </div>
  );
}
