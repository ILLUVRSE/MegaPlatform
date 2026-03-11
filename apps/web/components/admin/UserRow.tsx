"use client";

import { useState } from "react";

export default function UserRow({
  user,
  roles,
  onUpdate
}: {
  user: { id: string; email: string; name: string | null; role: string; disabled: boolean };
  roles: { id: string; name: string }[];
  onUpdate: (payload: { id: string; role: string; disabled: boolean }) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role);
  const [disabled, setDisabled] = useState(user.disabled);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ id: user.id, role, disabled });
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-illuvrse-border bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold">{user.name ?? "Unnamed"}</p>
        <p className="text-xs text-illuvrse-muted">{user.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-illuvrse-muted">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="ml-2 rounded-lg border border-illuvrse-border px-2 py-1 text-sm"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-illuvrse-muted">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />
          Disabled
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-illuvrse-primary px-3 py-1 text-xs font-semibold text-white"
        >
          {saving ? "Saving" : "Update"}
        </button>
      </div>
    </div>
  );
}
