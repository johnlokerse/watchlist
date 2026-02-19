import Dexie, { type EntityTable } from 'dexie';
import type { WatchedItem, SeriesProgress, WatchedEpisode } from './models';

const db = new Dexie('MovieTrackerDB') as Dexie & {
  watchedItems: EntityTable<WatchedItem, 'id'>;
  seriesProgress: EntityTable<SeriesProgress, 'id'>;
  watchedEpisodes: EntityTable<WatchedEpisode, 'id'>;
};

db.version(1).stores({
  watchedItems: '++id, tmdbId, contentType, status, userRating, addedAt',
  seriesProgress: '++id, watchedItemId, tmdbId',
});

db.version(3).stores({
  watchedItems: '++id, tmdbId, contentType, status, userRating, addedAt, releaseDate',
  seriesProgress: '++id, watchedItemId, tmdbId',
  watchedEpisodes: '++id, [tmdbId+season+episode], [tmdbId+season]',
});

export { db };
