import { useState, useEffect } from 'react';
import { useLibrary } from './LibraryContext';
import type { WatchedItem, SeriesProgress, WatchedEpisode, WatchLogEntry, ContentType, WatchedStatus, SeasonCheckInput, SeasonCheckResult } from './models';

const API = '/api';

// Global invalidation callback set by the first hook that renders
let _invalidate: (() => void) | null = null;
function triggerInvalidate() {
  _invalidate?.();
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

function useRegisterInvalidate() {
  const { invalidate } = useLibrary();
  useEffect(() => { _invalidate = invalidate; }, [invalidate]);
}

export function useWatchedItems(contentType?: ContentType, status?: WatchedStatus) {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [items, setItems] = useState<WatchedItem[] | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams();
    if (contentType) params.set('contentType', contentType);
    if (status) params.set('status', status);
    apiFetch<WatchedItem[]>(`/library?${params}`).then(setItems);
  }, [contentType, status, version]);

  return items;
}

export function useUpcomingFromLibrary(contentType: ContentType) {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [items, setItems] = useState<WatchedItem[] | undefined>(undefined);

  useEffect(() => {
    if (contentType === 'movie') {
      apiFetch<WatchedItem[]>('/library?contentType=movie').then((all) => {
        const today = new Date().toISOString().slice(0, 10);
        setItems(
          all
            .filter((i) => i.releaseDate && i.releaseDate >= today)
            .sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')),
        );
      });
      return;
    }

    Promise.all([
      apiFetch<WatchedItem[]>('/library?contentType=series'),
      apiFetch<SeriesProgress[]>('/progress').catch(() => [] as SeriesProgress[]),
    ]).then(([all, progress]) => {
      // Completed series normally drop off this page, but one with a newly
      // announced or airing season is exactly what "upcoming" is about.
      const flagged = new Set(progress.filter((p) => p.newSeasonState).map((p) => p.tmdbId));
      setItems(
        all
          .filter(
            (i) =>
              i.status === 'watching' ||
              i.status === 'plan_to_watch' ||
              (i.status === 'watched' && flagged.has(i.tmdbId)),
          )
          .sort((a, b) => a.title.localeCompare(b.title)),
      );
    });
  }, [contentType, version]);

  return items;
}

export function usePlannedMovies() {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [items, setItems] = useState<WatchedItem[] | undefined>(undefined);

  useEffect(() => {
    apiFetch<WatchedItem[]>('/library?contentType=movie').then((all) => {
      setItems(
        all
          .filter((i) => i.status === 'plan_to_watch' && !i.releaseDate)
          .sort((a, b) => a.title.localeCompare(b.title)),
      );
    });
  }, [version]);

  return items;
}

export function useWatchedItem(tmdbId: number, contentType: ContentType) {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [item, setItem] = useState<WatchedItem | undefined>(undefined);

  useEffect(() => {
    if (!tmdbId) { setItem(undefined); return; }
    apiFetch<WatchedItem>(`/library/${tmdbId}/${contentType}`)
      .then(setItem)
      .catch(() => setItem(undefined));
  }, [tmdbId, contentType, version]);

  return item;
}

export function useSeriesProgress(tmdbId: number) {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [progress, setProgress] = useState<SeriesProgress | undefined>(undefined);

  useEffect(() => {
    if (!tmdbId) { setProgress(undefined); return; }
    apiFetch<SeriesProgress | null>(`/progress/${tmdbId}`)
      .then((p) => setProgress(p ?? undefined))
      .catch(() => setProgress(undefined));
  }, [tmdbId, version]);

  return progress;
}

/**
 * All series progress rows keyed by tmdbId. The library renders one badge per
 * card, so a single request beats one request per visible poster.
 */
export function useAllSeriesProgress() {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [byTmdbId, setByTmdbId] = useState<Map<number, SeriesProgress> | undefined>(undefined);

  useEffect(() => {
    apiFetch<SeriesProgress[]>('/progress')
      .then((rows) => setByTmdbId(new Map(rows.map((r) => [r.tmdbId, r]))))
      .catch(() => setByTmdbId(undefined));
  }, [version]);

  return byTmdbId;
}

export async function fetchPendingSeasonChecks(): Promise<number[]> {
  const { tmdbIds } = await apiFetch<{ tmdbIds: number[] }>('/series/season-check/pending');
  return tmdbIds;
}

export async function postSeasonChecks(checks: SeasonCheckInput[]): Promise<SeasonCheckResult[]> {
  if (!checks.length) return [];
  const { results } = await apiFetch<{ results: SeasonCheckResult[] }>('/series/season-check', {
    method: 'POST',
    body: JSON.stringify({ checks }),
  });
  triggerInvalidate();
  return results;
}

export async function addToLibrary(item: Omit<WatchedItem, 'id' | 'addedAt' | 'updatedAt'>) {
  const result = await apiFetch<{ id: number }>('/library', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  triggerInvalidate();
  return result.id;
}

export async function updateWatchedItem(id: number, changes: Partial<WatchedItem>) {
  await apiFetch(`/library/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
  triggerInvalidate();
}

export async function removeFromLibrary(id: number) {
  await apiFetch(`/library/${id}`, { method: 'DELETE' });
  triggerInvalidate();
}

export async function updateSeriesProgress(progress: Omit<SeriesProgress, 'id'>) {
  await apiFetch('/progress', { method: 'PUT', body: JSON.stringify(progress) });
  triggerInvalidate();
}

export function useWatchLog(tmdbId: number, contentType: ContentType) {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [entries, setEntries] = useState<WatchLogEntry[] | undefined>(undefined);

  useEffect(() => {
    if (!tmdbId) return;
    apiFetch<WatchLogEntry[]>(`/library/${tmdbId}/${contentType}/watch-log`)
      .then(setEntries)
      .catch(() => setEntries(undefined));
  }, [tmdbId, contentType, version]);

  return entries;
}

export async function addWatchLogEntry(entry: {
  tmdbId: number; contentType: ContentType; watchedAt?: string; note?: string;
}) {
  const result = await apiFetch<{ id: number }>('/watch-log', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  triggerInvalidate();
  return result.id;
}

export async function removeWatchLogEntry(id: number) {
  await apiFetch(`/watch-log/${id}`, { method: 'DELETE' });
  triggerInvalidate();
}

export function useWatchedEpisodes(tmdbId: number, season: number) {
  useRegisterInvalidate();
  const { version } = useLibrary();
  const [episodes, setEpisodes] = useState<WatchedEpisode[] | undefined>(undefined);

  useEffect(() => {
    if (!tmdbId) { setEpisodes(undefined); return; }
    apiFetch<WatchedEpisode[]>(`/episodes/${tmdbId}/${season}`).then(setEpisodes);
  }, [tmdbId, season, version]);

  return episodes;
}

export async function toggleEpisodeWatched(tmdbId: number, season: number, episode: number) {
  await apiFetch('/episodes/toggle', { method: 'POST', body: JSON.stringify({ tmdbId, season, episode }) });
  triggerInvalidate();
}

export async function markSeasonWatched(tmdbId: number, season: number, episodes: number[]) {
  await apiFetch('/episodes/season', { method: 'POST', body: JSON.stringify({ tmdbId, season, episodes }) });
  triggerInvalidate();
}

export async function exportLibrary() {
  return apiFetch<{
    items: unknown[];
    progress: unknown[];
    episodes: unknown[];
    watchLog: unknown[];
  }>('/library/export');
}

export async function bulkImportEpisodes(entries: { tmdbId: number; season: number; episode: number }[]) {
  if (!entries.length) return;
  await apiFetch('/episodes/import', { method: 'POST', body: JSON.stringify({ entries }) });
  triggerInvalidate();
}

export async function clearLibrary() {
  await apiFetch('/library/clear', { method: 'POST' });
  triggerInvalidate();
}

export async function bulkAddWatchedEpisodes(entries: WatchedEpisode[]) {
  for (const e of entries) {
    await apiFetch('/episodes/toggle', { method: 'POST', body: JSON.stringify(e) }).catch(() => {});
  }
  triggerInvalidate();
}
