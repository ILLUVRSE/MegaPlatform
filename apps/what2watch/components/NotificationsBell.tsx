'use client';

import { useEffect, useMemo, useState } from 'react';

type NotificationItem = {
  id: string;
  type: string;
  createdAt: string;
  readAt: string | null;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => null);
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  const markRead = async (id: string) => {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-white/20 px-2 py-1 text-xs hover:border-accent">
        Notifications {unread ? `(${unread})` : ''}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#0b1320] p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold">Recent events</p>
          <ul className="max-h-64 space-y-2 overflow-auto text-xs">
            {items.slice(0, 8).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <span className="capitalize">{item.type.replace(/_/g, ' ')}</span>
                {!item.readAt ? (
                  <button type="button" className="text-accent" onClick={() => void markRead(item.id)}>
                    Read
                  </button>
                ) : null}
              </li>
            ))}
            {!items.length ? <li className="text-surf/60">No events yet</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
