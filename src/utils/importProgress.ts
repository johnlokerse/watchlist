import { resolveTraktId } from '../api/trakt';
import { addToLibrary, updateSeriesProgress, bulkAddWatchedEpisodes } from '../db/hooks';
import { TMDB_BASE_URL, TMDB_API_TOKEN } from './constants';
import type { WatchedStatus } from '../db/models';

export interface ProgressEntry {
  traktID: number;
  scope: number | null;
  seasonAndEpisodeNumberDictionary: Record<string, number[]>;
}

export interface ImportProgressReport {
  done: number;
  total: number;
  currentTitle: string;
  errors: number;
  lastError?: string;
}

async function fetchTMDBDetails(tmdbId: number, type: 'movie' | 'series') {
  const path = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
  const res = await fetch(`${TMDB_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TMDB_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${type} ${tmdbId}`);
  return res.json();
}

export async function importFromTraktProgress(
  progressData: Record<string, ProgressEntry>,
  traktClientId: string,
  onUpdate: (report: ImportProgressReport) => void,
): Promise<ImportProgressReport> {
  const entries = Object.values(progressData);
  const total = entries.length;
  let done = 0;
  let errors = 0;

  for (const entry of entries) {
    let title = `Trakt #${entry.traktID}`;
    try {
      const resolved = await resolveTraktId(entry.traktID, traktClientId);
      if (!resolved) {
        errors++;
        done++;
        onUpdate({ done, total, currentTitle: title, errors });
        continue;
      }

      title = resolved.title;
      const tmdbData = await fetchTMDBDetails(resolved.tmdbId, resolved.type);

      const seasons = entry.seasonAndEpisodeNumberDictionary;
      const seasonKeys = Object.keys(seasons)
        .map(Number)
        .filter((k) => (seasons[String(k)]?.length ?? 0) > 0);
      const hasProgress = seasonKeys.length > 0;
      const status: WatchedStatus = hasProgress ? 'watching' : 'plan_to_watch';

      const genreIds =
        tmdbData.genre_ids ?? tmdbData.genres?.map((g: { id: number }) => g.id) ?? [];

      const itemId = await addToLibrary({
        tmdbId: resolved.tmdbId,
        contentType: resolved.type,
        title: resolved.type === 'series' ? (tmdbData.name ?? title) : (tmdbData.title ?? title),
        posterPath: tmdbData.poster_path ?? null,
        releaseDate: (resolved.type === 'series' ? tmdbData.first_air_date : tmdbData.release_date) ?? null,
        status,
        userRating: null,
        notes: '',
        genreIds,
      });

      if (resolved.type === 'series' && hasProgress && itemId) {
        const maxSeason = Math.max(...seasonKeys);
        const episodes = seasons[String(maxSeason)] ?? [];
        const maxEpisode = episodes.length > 0 ? Math.max(...episodes) : 0;
        await updateSeriesProgress({
          watchedItemId: itemId as number,
          tmdbId: resolved.tmdbId,
          currentSeason: maxSeason,
          currentEpisode: maxEpisode,
          totalSeasons: tmdbData.number_of_seasons ?? maxSeason,
          totalEpisodes: tmdbData.number_of_episodes ?? 0,
        });

        // Populate individual watched episodes
        const episodeEntries = Object.entries(seasons).flatMap(([s, eps]) =>
          (eps as number[]).map((ep) => ({ tmdbId: resolved.tmdbId, season: Number(s), episode: ep })),
        );
        await bulkAddWatchedEpisodes(episodeEntries);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`Failed to import Trakt ID ${entry.traktID}:`, e);
      errors++;
      done++;
      onUpdate({ done, total, currentTitle: title, errors, lastError: `${title}: ${msg}` });
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }

    done++;
    onUpdate({ done, total, currentTitle: title, errors });
    // Small delay to respect Trakt rate limits
    await new Promise((r) => setTimeout(r, 250));
  }

  return { done, total, currentTitle: 'Complete', errors };
}
