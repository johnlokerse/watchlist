import type { TMDBSeasonSummary } from '../api/types';
import type { SeriesProgress, WatchedStatus } from '../db/models';

export function getInitialEpisodeSeason(
  status: WatchedStatus | undefined,
  progress: SeriesProgress | undefined,
  seasons: TMDBSeasonSummary[] | undefined,
): number {
  const currentSeason = progress?.currentSeason ?? 1;
  const newSeason = progress?.newSeasonNumber;
  if (!newSeason || currentSeason >= newSeason) return currentSeason;

  // While the season is only announced, "watched" means the accepted seasons
  // are complete. "Watching" means the user is still working through one.
  if (progress.newSeasonState === 'announced') {
    return status === 'watched' ? newSeason : currentSeason;
  }

  const currentEpisodeCount = seasons?.find(
    (season) => season.season_number === currentSeason,
  )?.episode_count;
  const isCurrentSeasonInProgress =
    status === 'watching' &&
    progress.currentEpisode > 0 &&
    (currentEpisodeCount == null || progress.currentEpisode <= currentEpisodeCount);

  return isCurrentSeasonInProgress ? currentSeason : newSeason;
}
