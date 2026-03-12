import Link from "next/link";

const FRIENDS = [
  { name: "Ryan", status: "Watching Nebula Nights" },
  { name: "Alex", status: "Grinding GameGrid" },
  { name: "Jamie", status: "Uploading a short" }
];

const INVITES = [
  { title: "Nebula Nights", href: "/party", note: "2 seats open" },
  { title: "Arcade Rush", href: "/party/minigames", note: "Starts in 6 min" }
];

const ACTIVITY = [
  "Ryan started a stream",
  "Alex liked a short",
  "Jamie published a remix",
  "Studio render completed"
];

export default function PlatformSocialPanel() {
  return (
    <div className="platform-social-shell">
      <section className="platform-social-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Online</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Friends</h2>
          </div>
          <span className="rounded-full border border-[#e2b443]/30 bg-[#e2b443]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ffe7ae]">
            3 live
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {FRIENDS.map((friend) => (
            <div key={friend.name} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
              <div className="relative h-10 w-10 rounded-2xl" style={{ background: "linear-gradient(135deg, #7fffd4, #1c8174)" }}>
                <span className="platform-live-dot absolute -bottom-1 -right-1 border-2 border-[#0a1a1a]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{friend.name}</p>
                <div className="flex items-center gap-2">
                  <span className="platform-live-dot" />
                  <p className="truncate text-xs text-white/60">{friend.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-social-card">
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Party invites</p>
        <div className="mt-4 space-y-3">
          {INVITES.map((invite) => (
            <div key={invite.title} className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">{invite.title}</p>
              <p className="mt-1 text-xs text-white/52">{invite.note}</p>
              <Link href={invite.href} className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.26em] text-[#ffe7ae]">
                Join
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-social-card">
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Activity</p>
        <div className="mt-4 space-y-3">
          {ACTIVITY.map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-white/72">
              <div className="flex items-center gap-3">
                <span className="platform-live-dot" />
                <span>{item}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
