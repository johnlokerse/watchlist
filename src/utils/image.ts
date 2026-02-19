import { TMDB_IMAGE_BASE } from './constants';

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

export function posterUrl(path: string | null, size: PosterSize = 'w342'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: BackdropSize = 'w1280'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function profileUrl(path: string | null, size: ProfileSize = 'w185'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function logoUrl(path: string | null, size: LogoSize = 'w92'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}
