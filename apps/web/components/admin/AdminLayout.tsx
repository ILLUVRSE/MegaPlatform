import AdminNav from "@/components/admin/AdminNav";

export default function AdminLayout({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-illuvrse-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">ILLUVRSE</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
            {subtitle ? <p className="text-sm text-illuvrse-muted">{subtitle}</p> : null}
          </div>
          <div className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white">
            Admin
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="sticky top-8 h-fit">
          <AdminNav />
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
