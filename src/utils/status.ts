import type { WatchedStatus } from '../db/models';

/** Short badge label for a library item shown outside the library (search, Discover). */
export function statusLabel(status: WatchedStatus): string | null {
  if (status === 'watched') return 'Watched';
  if (status === 'plan_to_watch' || status === 'watching') return 'In Library';
  return null;
}
