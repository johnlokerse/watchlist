import type { Request, Response } from 'express';
import { queries } from './db.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_PROXY_PREFIX = '/api/tmdb';

export interface TmdbApiResponse extends Record<string, unknown> {
  results?: Record<string, unknown>[];
  credits?: {
    cast?: Array<{ name: string; character: string }>;
  };
  runtime?: unknown;
  episode_run_time?: unknown[];
  status?: unknown;
  tagline?: unknown;
  cast?: Record<string, unknown>[];
  title?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  episodes?: Record<string, unknown>[];
}

export class TmdbTokenMissingError extends Error {
  constructor() {
    super('TMDB API token is missing. Configure the TMDB API token in Settings.');
    this.name = 'TmdbTokenMissingError';
  }
}

export function isTmdbTokenMissingError(err: unknown): err is TmdbTokenMissingError {
  return err instanceof TmdbTokenMissingError;
}

export function getTmdbApiToken(): string {
  const settings = queries.getSettings();
  const rawToken = settings.tmdbApiToken;
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';

  if (!token) {
    throw new TmdbTokenMissingError();
  }

  return token;
}

export function hasTmdbApiToken(): boolean {
  const settings = queries.getSettings();
  const rawToken = settings.tmdbApiToken;
  return typeof rawToken === 'string' && rawToken.trim().length > 0;
}

export function createTmdbUrl(path: string, params: Record<string, string> = {}): URL {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${TMDB_BASE_URL}${normalizedPath}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

function isTmdbReadAccessToken(token: string): boolean {
  return token.split('.').length === 3;
}

function applyTmdbAuth(url: URL, token: string): HeadersInit {
  if (isTmdbReadAccessToken(token)) {
    return { Authorization: `Bearer ${token}` };
  }

  url.searchParams.set('api_key', token);
  return {};
}

export async function tmdbFetchJson<T = TmdbApiResponse>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = getTmdbApiToken();
  const url = createTmdbUrl(path, params);
  const headers = applyTmdbAuth(url, token);
  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`TMDB ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function createProxyUrl(req: Request): URL {
  const prefixIndex = req.originalUrl.indexOf(TMDB_PROXY_PREFIX);
  const suffix = prefixIndex >= 0
    ? req.originalUrl.slice(prefixIndex + TMDB_PROXY_PREFIX.length)
    : '';
  const pathAndQuery = suffix.startsWith('/') || suffix.startsWith('?') ? suffix : `/${suffix}`;
  return new URL(`/3${pathAndQuery}`, 'https://api.themoviedb.org');
}

export async function handleTmdbProxy(req: Request, res: Response) {
  let token: string;
  try {
    token = getTmdbApiToken();
  } catch (err) {
    if (isTmdbTokenMissingError(err)) {
      res.status(503).json({
        error: 'tmdb_token_missing',
        message: err.message,
      });
      return;
    }
    throw err;
  }

  try {
    const url = createProxyUrl(req);
    const headers = applyTmdbAuth(url, token);
    const tmdbResponse = await fetch(url, {
      headers: {
        ...headers,
        Accept: req.get('accept') ?? 'application/json',
      },
    });

    const contentType = tmdbResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const body = Buffer.from(await tmdbResponse.arrayBuffer());
    res.status(tmdbResponse.status).send(body);
  } catch (err) {
    console.error('TMDB proxy error:', err);
    res.status(502).json({
      error: 'tmdb_proxy_error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
