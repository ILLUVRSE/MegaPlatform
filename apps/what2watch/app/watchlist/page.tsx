import Link from 'next/link';
import { getOrCreateUserServer } from '@/lib/auth';
import { getNotificationEvents } from '@/lib/services/notifications';
import { getWatchlist } from '@/lib/services/watchlist';
import { tmdbImage } from '@/lib/images';
import { NotificationList } from '@/components/NotificationList';
import { WatchlistRemoveButton } from '@/components/WatchlistRemoveButton';

export const metadata = {
  title: 'Watchlist | What2Watch'
};

export default async function WatchlistPage() {
  const { userId } = await getOrCreateUserServer();
  const [items, notifications] = await Promise.all([getWatchlist(userId), getNotificationEvents(userId)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Watchlist</h1>
      <NotificationList initialItems={notifications} />
      {items.length === 0 ? <p className="text-sm text-surf/70">No titles saved yet.</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.titleId} className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
            <Link href={`/title/${item.type}/${item.tmdbId}`}>
              <img src={tmdbImage(item.poster, 'w300')} alt={item.name} className="aspect-[2/3] w-full rounded-lg object-cover" />
              <p className="line-clamp-1 pt-2 text-sm">{item.name}</p>
            </Link>
            <WatchlistRemoveButton titleId={item.titleId} />
          </div>
        ))}
      </div>
    </div>
  );
}
