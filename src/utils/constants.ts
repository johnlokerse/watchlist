import type { WatchedStatus } from '../db/models';

export const TMDB_BASE_URL = '/api/tmdb';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const DEFAULT_COUNTRY = 'NL';

export const STALE_TIME_LIST = 5 * 60 * 1000; // 5 min
export const STALE_TIME_DETAIL = 30 * 60 * 1000; // 30 min

export const STATUS_OPTIONS = [
  { value: 'watched', label: 'Watched' },
  { value: 'watching', label: 'Watching' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
] as const satisfies ReadonlyArray<{ value: WatchedStatus; label: string }>;
