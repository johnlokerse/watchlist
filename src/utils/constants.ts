export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
export const TMDB_API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN as string;

export const DEFAULT_COUNTRY = 'NL';

export const STALE_TIME_LIST = 5 * 60 * 1000; // 5 min
export const STALE_TIME_DETAIL = 30 * 60 * 1000; // 30 min
