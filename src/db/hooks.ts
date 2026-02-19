import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './database';
import type { WatchedItem, SeriesProgress, WatchedEpisode, ContentType, WatchedStatus } from './models';

export function useWatchedItems(contentType?: ContentType, status?: WatchedStatus) {
  return useLiveQuery(async () => {
    let collection = db.watchedItems.toCollection();
    if (contentType) {
      collection = db.watchedItems.where('contentType').equals(contentType);
    }
    const items = await collection.reverse().sortBy('addedAt');
    if (status) return items.filter((i) => i.status === status);
    return items;
  }, [contentType, status]);
}

export function useUpcomingFromLibrary(contentType: ContentType) {
  return useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await db.watchedItems.where('contentType').equals(contentType).toArray();
    if (contentType === 'movie') {
      return all
        .filter((i) => i.releaseDate && i.releaseDate >= today)
        .sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''));
    }
    // For series: show watching + plan_to_watch
    return all
      .filter((i) => i.status === 'watching' || i.status === 'plan_to_watch')
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [contentType]);
}

export function usePlannedMovies() {
  return useLiveQuery(async () => {
    const all = await db.watchedItems.where('contentType').equals('movie').toArray();
    return all
      .filter((i) => i.status === 'plan_to_watch' && !i.releaseDate)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, []);
}

export function useWatchedItem(tmdbId: number, contentType: ContentType) {
  return useLiveQuery(
    () => db.watchedItems.where({ tmdbId, contentType }).first(),
    [tmdbId, contentType],
  );
}

export function useSeriesProgress(tmdbId: number) {
  return useLiveQuery(
    () => db.seriesProgress.where('tmdbId').equals(tmdbId).first(),
    [tmdbId],
  );
}

export async function addToLibrary(item: Omit<WatchedItem, 'id' | 'addedAt' | 'updatedAt'>) {
  const existing = await db.watchedItems.where({ tmdbId: item.tmdbId, contentType: item.contentType }).first();
  if (existing) return existing.id;
  const now = new Date();
  return db.watchedItems.add({ ...item, addedAt: now, updatedAt: now });
}

export async function updateWatchedItem(id: number, changes: Partial<WatchedItem>) {
  return db.watchedItems.update(id, { ...changes, updatedAt: new Date() });
}

export async function removeFromLibrary(id: number) {
  const item = await db.watchedItems.get(id);
  if (item?.contentType === 'series') {
    await db.seriesProgress.where('watchedItemId').equals(id).delete();
  }
  return db.watchedItems.delete(id);
}

export async function updateSeriesProgress(progress: Omit<SeriesProgress, 'id'>) {
  const existing = await db.seriesProgress.where('tmdbId').equals(progress.tmdbId).first();
  if (existing) {
    return db.seriesProgress.update(existing.id!, progress);
  }
  return db.seriesProgress.add(progress);
}

export function useWatchedEpisodes(tmdbId: number, season: number) {
  return useLiveQuery(
    () => db.watchedEpisodes.where({ tmdbId, season }).toArray(),
    [tmdbId, season],
  );
}

export async function toggleEpisodeWatched(tmdbId: number, season: number, episode: number) {
  const existing = await db.watchedEpisodes.where({ tmdbId, season, episode }).first();
  if (existing) return db.watchedEpisodes.delete(existing.id!);
  return db.watchedEpisodes.add({ tmdbId, season, episode });
}

export async function markSeasonWatched(tmdbId: number, season: number, episodes: number[]) {
  await db.watchedEpisodes.where({ tmdbId, season }).delete();
  await db.watchedEpisodes.bulkAdd(episodes.map((episode) => ({ tmdbId, season, episode })));
}

export async function exportLibrary() {
  const items = await db.watchedItems.toArray();
  return items.map(({ tmdbId, title, contentType, status, posterPath, releaseDate, userRating, notes }) => ({
    tmdbId,
    title,
    contentType,
    status,
    posterPath,
    releaseDate,
    ...(userRating != null && { userRating }),
    ...(notes && { notes }),
  }));
}

export async function clearLibrary() {
  await db.watchedItems.clear();
  await db.seriesProgress.clear();
  await db.watchedEpisodes.clear();
}

export async function bulkAddWatchedEpisodes(entries: WatchedEpisode[]) {
  for (const e of entries) {
    const exists = await db.watchedEpisodes.where({ tmdbId: e.tmdbId, season: e.season, episode: e.episode }).first();
    if (!exists) await db.watchedEpisodes.add(e);
  }
}
