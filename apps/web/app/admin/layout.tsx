/**
 * Admin layout wrapper.
 * Data: none.
 * Guard: requireAdmin (RBAC).
 */
import { redirect } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdmin } from "@/lib/rbac";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/signin");
  }

  return (
    <AdminLayout title="Admin Control" subtitle="ILLUVRSE MegaPlatform operations">
      {children}
    </AdminLayout>
  );
}
