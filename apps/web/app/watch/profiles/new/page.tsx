/**
 * Create profile page.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CreateProfileForm from "../components/CreateProfileForm";
import Link from "next/link";

export default async function NewProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <div className="-mx-6 space-y-6 bg-[#07070b] px-6 pb-10 text-white">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Profiles</p>
          <h1 className="text-3xl font-semibold">Sign in required</h1>
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

  return (
    <div className="-mx-6 space-y-6 bg-[#07070b] px-6 pb-10 text-white">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Profiles</p>
        <h1 className="text-3xl font-semibold">Create profile</h1>
        <p className="text-sm text-white/60">Profiles personalize recommendations.</p>
      </header>
      <CreateProfileForm />
      <Link href="/watch/profiles" className="text-xs uppercase tracking-[0.3em] text-white/60">
        Back to profiles
      </Link>
    </div>
  );
}
