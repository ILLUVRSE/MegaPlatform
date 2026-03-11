/**
 * Roles admin page.
 * Data: GET /api/admin/roles.
 * Actions: POST/PUT /api/admin/roles -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useState } from "react";
import RoleForm, { type RoleFormValues } from "@/components/admin/RoleForm";

type RoleRecord = {
  id: string;
  name: string;
  permissions: string[];
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);

  const loadRoles = async () => {
    const payload = await fetch("/api/admin/roles").then((res) => res.json());
    setRoles(payload.data ?? []);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async (values: RoleFormValues) => {
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!res.ok) {
      throw new Error("Failed to create role.");
    }

    await loadRoles();
  };

  const handleUpdate = async (roleId: string, values: RoleFormValues) => {
    const res = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: roleId, ...values })
    });

    if (!res.ok) {
      throw new Error("Failed to update role.");
    }

    await loadRoles();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Create Role</h2>
        <p className="text-sm text-illuvrse-muted">Define role permission groups.</p>
        <div className="mt-4">
          <RoleForm onSubmit={handleCreate} />
        </div>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
            <h3 className="text-lg font-semibold">{role.name}</h3>
            <p className="text-xs text-illuvrse-muted">
              Permissions: {role.permissions.join(", ") || "None"}
            </p>
            <div className="mt-4">
              <RoleForm
                initialValues={{
                  name: role.name,
                  permissions: role.permissions.join(", ")
                }}
                onSubmit={(values) => handleUpdate(role.id, values)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
