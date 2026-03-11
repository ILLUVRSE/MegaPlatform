"use client";

import { useState } from "react";

export type RoleFormValues = {
  name: string;
  permissions: string;
};

export default function RoleForm({
  initialValues,
  onSubmit
}: {
  initialValues?: Partial<RoleFormValues>;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<RoleFormValues>({
    name: initialValues?.name ?? "",
    permissions: initialValues?.permissions ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
      setValues({ name: "", permissions: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Role Name
          <input
            type="text"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
            required
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Permissions (comma separated)
          <input
            type="text"
            value={values.permissions}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, permissions: event.target.value }))
            }
            className="w-full rounded-xl border border-illuvrse-border px-4 py-2"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white"
      >
        {saving ? "Saving..." : "Save Role"}
      </button>
    </form>
  );
}
