/**
 * Users admin page.
 * Data: GET /api/admin/users, GET /api/admin/roles.
 * Actions: PUT /api/admin/users/[id] -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import UserRow from "@/components/admin/UserRow";

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  disabled: boolean;
};

type RoleRecord = { id: string; name: string };

export default function UsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") ?? "";
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/users?q=${encodeURIComponent(query)}`).then((res) => res.json()),
      fetch("/api/admin/roles").then((res) => res.json())
    ]).then(([userPayload, rolePayload]) => {
      setUsers(userPayload.data ?? []);
      setRoles(rolePayload.data ?? []);
    });
  }, [query]);

  const handleUpdate = async (payload: { id: string; role: string; disabled: boolean }) => {
    const res = await fetch(`/api/admin/users/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error("Failed to update user.");
    }

    const updated = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`).then((res) =>
      res.json()
    );
    setUsers(updated.data ?? []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-illuvrse-muted">Manage accounts and access.</p>
      </div>
      <input
        value={query}
        onChange={(event) => router.replace(`/admin/users?q=${encodeURIComponent(event.target.value)}`)}
        placeholder="Search users"
        className="w-full rounded-xl border border-illuvrse-border px-4 py-2 md:max-w-xs"
      />
      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-illuvrse-border bg-white p-6">No users found.</div>
        ) : (
          users.map((user) => (
            <UserRow key={user.id} user={user} roles={roles} onUpdate={handleUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
