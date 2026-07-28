import { useEffect, useRef, useState } from 'react';
import { useSeriesDetailBatch } from '../api/tmdb';
import { fetchPendingSeasonChecks, postSeasonChecks } from '../db/hooks';
import type { SeasonCheckInput } from '../db/models';
import type { TMDBSeriesDetail } from '../api/types';

/** Season 0 holds specials, which never count as a "new season". */
function regularSeasons(detail: TMDBSeriesDetail) {
  return (detail.seasons ?? []).filter((s) => s.season_number > 0);
}

function toSeasonCheck(tmdbId: number, detail: TMDBSeriesDetail): SeasonCheckInput {
  const seasons = regularSeasons(detail);
  const latest = seasons.reduce<typeof seasons[number] | null>(
    (best, s) => (!best || s.season_number > best.season_number ? s : best),
    null,
  );

  return {
    tmdbId,
    // The full line-up lets the server tell an airing season apart from a
    // placeholder stub for a later one.
    seasons: seasons.map((s) => ({
      season: s.season_number,
      airDate: s.air_date ?? null,
      episodeCount: s.episode_count ?? 0,
    })),
    latestSeason: latest?.season_number ?? detail.number_of_seasons ?? 0,
    latestSeasonAirDate: latest?.air_date ?? null,
    // Prefer the season breakdown so specials don't inflate the total.
    numberOfEpisodes: seasons.length
      ? seasons.reduce((sum, s) => sum + (s.episode_count ?? 0), 0)
      : detail.number_of_episodes ?? 0,
    lastAiredSeason: detail.last_episode_to_air?.season_number ?? null,
    lastAiredEpisode: detail.last_episode_to_air?.episode_number ?? null,
  };
}

/**
 * Reconciles library series against TMDB when a page mounts: series the server
 * flags as stale are re-fetched, summarised, and posted back so the server can
 * surface newly announced or newly airing seasons.
 */
export function useNewSeasonCheck(enabled: boolean) {
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const requestedRef = useRef(false);
  const postedRef = useRef(false);

  useEffect(() => {
    if (!enabled || requestedRef.current) return;
    requestedRef.current = true;
    fetchPendingSeasonChecks()
      .then(setPendingIds)
      .catch(() => setPendingIds([]));
  }, [enabled]);

  const detailQueries = useSeriesDetailBatch(pendingIds);

  useEffect(() => {
    if (postedRef.current || pendingIds.length === 0) return;
    // Wait for the whole batch so a single POST covers the page load.
    if (detailQueries.some((q) => q.isLoading)) return;

    const checks = pendingIds
      .map((tmdbId, idx) => {
        const detail = detailQueries[idx]?.data;
        return detail ? toSeasonCheck(tmdbId, detail) : null;
      })
      .filter((c): c is SeasonCheckInput => c !== null);

    postedRef.current = true;
    if (checks.length > 0) void postSeasonChecks(checks).catch(() => {});
  }, [pendingIds, detailQueries]);
}
