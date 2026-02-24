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
  addedAt: Date;
  updatedAt: Date;
}

export interface WatchedEpisode {
  id?: number;
  tmdbId: number;
  season: number;
  episode: number;
}

export interface SeriesProgress {
  id?: number;
  watchedItemId: number;
  tmdbId: number;
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  totalEpisodes: number;
}
