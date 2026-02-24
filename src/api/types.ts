// TMDB Movie (list item)
export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
}

// TMDB Movie (detail)
export interface TMDBMovieDetail extends Omit<TMDBMovie, 'genre_ids'> {
  runtime: number | null;
  genres: TMDBGenre[];
  tagline: string;
  status: string;
  imdb_id: string | null;
  credits?: TMDBCredits;
  'watch/providers'?: TMDBWatchProvidersResponse;
  videos?: TMDBVideosResponse;
}

// TMDB Series (list item)
export interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
}

// TMDB Series (detail)
export interface TMDBSeriesDetail extends Omit<TMDBSeries, 'genre_ids'> {
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  genres: TMDBGenre[];
  tagline: string;
  status: string;
  networks: { id: number; name: string; logo_path: string | null }[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  credits?: TMDBCredits;
  'watch/providers'?: TMDBWatchProvidersResponse;
  videos?: TMDBVideosResponse;
  external_ids?: { imdb_id: string | null };
  next_episode_to_air: TMDBNextEpisode | null;
  last_episode_to_air: TMDBNextEpisode | null;
  seasons?: TMDBSeasonSummary[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBWatchProvidersResponse {
  results: Record<string, TMDBCountryProviders>;
}

export interface TMDBCountryProviders {
  flatrate?: TMDBProvider[];
  rent?: TMDBProvider[];
  buy?: TMDBProvider[];
  link?: string;
}

export interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  still_path: string | null;
  vote_average: number;
  runtime: number | null;
}

export interface TMDBNextEpisode {
  id: number;
  name: string;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  overview: string;
  still_path: string | null;
  runtime: number | null;
}

export interface TMDBSeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episodes: TMDBEpisode[];
}

export interface TMDBPagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TMDBVideosResponse {
  results: TMDBVideo[];
}
