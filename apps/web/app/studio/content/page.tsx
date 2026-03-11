/**
 * Studio content lifecycle page.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ContentManager from "./components/ContentManager";
import { contentDb } from "@/lib/contentDb";

export default async function StudioContentPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const items = userId
    ? await contentDb.contentItem.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        include: { assets: { orderBy: { createdAt: "desc" }, take: 5 } },
        take: 50
      })
    : [];
  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }));

  return (
    <div className="space-y-4">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Content</p>
        <h1 className="text-3xl font-semibold">Content Lifecycle</h1>
        <p className="text-sm text-illuvrse-muted">Draft, review, publish, and rejection controls. RBAC hardening remains TODO.</p>
      </header>
      <ContentManager initialItems={serialized} />
    </div>
  );
}
