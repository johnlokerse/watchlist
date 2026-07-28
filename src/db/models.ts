export type ContentType = 'movie' | 'series';
export type WatchedStatus = 'watched' | 'watching' | 'plan_to_watch';

export interface WatchedItem {
  id?: number;
  tmdbId: number;
  contentType: ContentType;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  status: WatchedStatus;
  userRating: number | null;
  notes: string;
  genreIds: number[];
  watchedAt: string | null;
  addedAt: Date;
  updatedAt: Date;
}

/** Compact TMDB summary the client posts during a new-season check. */
export interface SeasonSummary {
  season: number;
  airDate: string | null;
  episodeCount: number;
}

export interface SeasonCheckInput {
  tmdbId: number;
  seasons: SeasonSummary[];
  latestSeason: number;
  latestSeasonAirDate: string | null;
  numberOfEpisodes: number;
  lastAiredSeason: number | null;
  lastAiredEpisode: number | null;
}

export interface SeasonCheckResult {
  tmdbId: number;
  status: WatchedStatus;
  newSeasonNumber: number | null;
  newSeasonState: NewSeasonState | null;
  changed: boolean;
}

export interface WatchLogEntry {
  id: number;
  tmdbId: number;
  contentType: ContentType;
  watchedAt: string;
  note: string;
}

export interface WatchedEpisode {
  id?: number;
  tmdbId: number;
  season: number;
  episode: number;
}

export type NewSeasonState = 'announced' | 'airing';

export interface SeriesProgress {
  id?: number;
  watchedItemId: number;
  tmdbId: number;
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  totalEpisodes: number;
  /** Season number TMDB added after the user's accepted baseline, if any. */
  newSeasonNumber?: number | null;
  newSeasonState?: NewSeasonState | null;
  newSeasonAirDate?: string | null;
  lastCheckedAt?: string | null;
}
