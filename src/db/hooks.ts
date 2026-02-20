import { useState, useEffect } from 'react';
import { useLibrary } from './LibraryContext';
import type { WatchedItem, SeriesProgress, WatchedEpisode, ContentType, WatchedStatus } from './models';

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
    apiFetch<WatchedItem[]>(`/library?contentType=${contentType}`).then((all) => {
      const today = new Date().toISOString().slice(0, 10);
      if (contentType === 'movie') {
        setItems(
          all
            .filter((i) => i.releaseDate && i.releaseDate >= today)
            .sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')),
        );
      } else {
        setItems(
          all
            .filter((i) => i.status === 'watching' || i.status === 'plan_to_watch')
            .sort((a, b) => a.title.localeCompare(b.title)),
        );
      }
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
