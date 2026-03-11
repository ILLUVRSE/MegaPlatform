/**
 * Profile picker page.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@illuvrse/db";
import ProfilePickerGrid from "./components/ProfilePickerGrid";
import Link from "next/link";

export default async function WatchProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <div className="-mx-6 space-y-6 bg-[#07070b] px-6 pb-10 text-white">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Watch Profiles</p>
          <h1 className="text-3xl font-semibold">Sign in to pick a profile</h1>
          <p className="text-sm text-white/60">Profiles personalize My List and Continue Watching.</p>
          <Link
            href="/auth/signin"
            className="mt-4 inline-flex rounded-full bg-white px-6 py-2 text-xs font-semibold uppercase tracking-widest text-black"
          >
            Sign In
          </Link>
        </header>
      </div>
    );
  }

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="-mx-6 space-y-6 bg-[#07070b] px-6 pb-10 text-white">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Who's watching?</p>
        <h1 className="text-3xl font-semibold">Choose a profile</h1>
      </header>
      <ProfilePickerGrid profiles={profiles} />
    </div>
  );
}
