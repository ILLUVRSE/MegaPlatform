'use client';

import { useState } from 'react';

type NotificationItem = {
  id: string;
  type: string;
  titleId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export function NotificationList({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);

  const markRead = async (id: string) => {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
  };

  if (!items.length) return null;

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h2 className="text-sm font-semibold">Notification stubs</h2>
      <ul className="mt-2 space-y-2 text-xs text-surf/80">
        {items.slice(0, 8).map((n) => (
          <li key={n.id} className="flex items-center justify-between gap-2">
            <div>
              <span className="capitalize">{n.type.replace(/_/g, ' ')}</span> · {new Date(n.createdAt).toLocaleString()}
            </div>
            {!n.readAt ? (
              <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => void markRead(n.id)}>
                Mark read
              </button>
            ) : (
              <span className="text-surf/50">Read</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
