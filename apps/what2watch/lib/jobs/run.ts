import { refreshAvailability } from '@/lib/services/availability';
import { createLeavingSoonNotifications } from '@/lib/services/notifications';
import { syncGenres, syncTmdbLists } from '@/lib/services/sync';
import { computeDailyTrends } from '@/lib/services/trends';

export async function runAllJobs(): Promise<Record<string, number>> {
  await syncGenres();
  const syncResult = await syncTmdbLists();
  const trendResult = await computeDailyTrends();
  const availability = await refreshAvailability('US');
  const leavingSoonNotifications = await createLeavingSoonNotifications('US');

  return {
    syncedTitles: syncResult.synced,
    trendSnapshots: trendResult.count,
    availabilityUpdated: availability.updated,
    leavingSoonNotifications
  };
}
