import type { Request, Response } from 'express';
import { queries } from './db.js';

const API_BASE_URL = 'https://api.movieofthenight.com/v4';
const RAPID_API_BASE_URL = 'https://streaming-availability.p.rapidapi.com';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const serviceTmdbProviderIds: Record<string, number[]> = {
  netflix: [8],
  prime: [9, 10, 119],
  disney: [337],
  apple: [2, 350],
  hbo: [384, 1899],
  hulu: [15],
  peacock: [386],
  paramount: [531],
  mubi: [11],
  crunchyroll: [283],
  skyshowtime: [1773],
  videoland: [72],
};

interface StreamingOption {
  service?: {
    id?: string;
    name?: string;
  };
  addon?: {
    name?: string;
  };
  type?: string;
  link?: string;
  videoLink?: string;
  quality?: string;
}

interface StreamingShowResponse {
  streamingOptions?: Record<string, StreamingOption[]>;
}

type StreamingAvailabilityResult =
  | { ok: true; body: StreamingShowResponse }
  | { ok: false; status: number; statusText: string; nonJson: boolean };

export interface WatchDeepLink {
  serviceId: string;
  serviceName: string;
  tmdbProviderIds: number[];
  type: string;
  link: string;
  videoLink?: string;
  quality?: string;
  addonName?: string;
}

export interface WatchLinksResponse {
  configured: boolean;
  cached: boolean;
  links: WatchDeepLink[];
  error?: string;
}

export async function handleWatchLinks(req: Request, res: Response) {
  const { contentType, tmdbId } = req.params;
  const country = String(req.query.country ?? '').trim().toLowerCase();

  if ((contentType !== 'movie' && contentType !== 'series') || !Number.isFinite(Number(tmdbId)) || country.length !== 2) {
    res.status(400).json({ configured: false, cached: false, links: [], error: 'Invalid watch link request.' });
    return;
  }

  const settings = queries.getSettings();
  const apiKey = typeof settings.streamingAvailabilityApiKey === 'string'
    ? settings.streamingAvailabilityApiKey.trim()
    : '';

  if (!apiKey) {
    res.json({ configured: false, cached: false, links: [] });
    return;
  }

  const cacheKey = `${contentType}:${tmdbId}:${country}`;
  const cached = queries.getWatchLinkCache(cacheKey) as WatchLinksResponse | null;
  if (cached) {
    res.json({ ...cached, configured: true, cached: true });
    return;
  }

  try {
    const links = await fetchWatchLinks({
      apiKey,
      contentType,
      tmdbId: Number(tmdbId),
      country,
    });
    const payload: WatchLinksResponse = { configured: true, cached: false, links };
    queries.saveWatchLinkCache(cacheKey, payload, CACHE_TTL_MS);
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch watch links.';
    res.status(502).json({ configured: true, cached: false, links: [], error: message });
  }
}

async function fetchWatchLinks({
  apiKey,
  contentType,
  tmdbId,
  country,
}: {
  apiKey: string;
  contentType: 'movie' | 'series';
  tmdbId: number;
  country: string;
}) {
  const showId = contentType === 'movie' ? `movie/${tmdbId}` : `tv/${tmdbId}`;
  const path = `/shows/${encodeURIComponent(showId)}`;
  const params = new URLSearchParams({
    country,
    series_granularity: 'show',
  });

  const primary = await fetchStreamingAvailability(`${API_BASE_URL}${path}?${params}`, {
    'X-API-Key': apiKey,
  });

  if (primary.ok) {
    return parseWatchLinks(primary.body, country);
  }

  if (primary.status === 404) return [];

  if (primary.status === 401 || primary.status === 403 || primary.nonJson) {
    const rapidApi = await fetchStreamingAvailability(`${RAPID_API_BASE_URL}${path}?${params}`, {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
    });
    if (rapidApi.ok) {
      return parseWatchLinks(rapidApi.body, country);
    }
    if (rapidApi.status === 404) return [];
    if (rapidApi.nonJson) {
      throw new Error('Streaming Availability API returned HTML instead of JSON. Check whether the API key matches the configured API provider.');
    }
    throw new Error(`Streaming Availability API error: ${rapidApi.status} ${rapidApi.statusText}`);
  }

  throw new Error(`Streaming Availability API error: ${primary.status} ${primary.statusText}`);
}

async function fetchStreamingAvailability(url: string, headers: Record<string, string>): Promise<StreamingAvailabilityResult> {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  const contentType = response.headers.get('content-type') ?? '';

  if (response.ok && contentType.includes('application/json')) {
    return { ok: true, body: (await response.json()) as StreamingShowResponse };
  }

  if (response.ok) {
    return { ok: false, status: response.status, statusText: response.statusText, nonJson: true };
  }

  return { ok: false, status: response.status, statusText: response.statusText, nonJson: false };
}

function parseWatchLinks(show: StreamingShowResponse, country: string): WatchDeepLink[] {
  const options = show.streamingOptions?.[country] ?? show.streamingOptions?.[country.toUpperCase()] ?? [];
  return options
    .filter((option) => option.link && option.service?.id && option.service?.name)
    .map((option) => {
      const serviceId = option.service?.id ?? '';
      return {
        serviceId,
        serviceName: option.service?.name ?? serviceId,
        tmdbProviderIds: serviceTmdbProviderIds[serviceId] ?? [],
        type: option.type ?? 'subscription',
        link: option.link ?? '',
        ...(option.videoLink && { videoLink: option.videoLink }),
        ...(option.quality && { quality: option.quality }),
        ...(option.addon?.name && { addonName: option.addon.name }),
      };
    });
}
