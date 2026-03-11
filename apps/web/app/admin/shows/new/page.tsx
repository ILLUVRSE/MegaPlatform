/**
 * Create show page.
 * Data: POST /api/admin/shows -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useRouter } from "next/navigation";
import ShowForm, { type ShowFormValues } from "@/components/admin/ShowForm";

export default function NewShowPage() {
  const router = useRouter();

  const handleSubmit = async (values: ShowFormValues) => {
    const res = await fetch("/api/admin/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(payload.error ?? "Failed to create show.");
    }

    router.push("/admin/shows");
  };

  return (
    <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
      <h2 className="text-xl font-semibold">Create Show</h2>
      <p className="text-sm text-illuvrse-muted">Add metadata for a new show.</p>
      <div className="mt-6">
        <ShowForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
