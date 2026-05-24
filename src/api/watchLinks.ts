import { useQuery } from '@tanstack/react-query';

export interface WatchDeepLink {
  serviceId: string;
  serviceName: string;
  tmdbProviderIds: number[];
  type: 'subscription' | 'free' | 'rent' | 'buy' | 'addon' | string;
  link: string;
  videoLink?: string;
  quality?: string;
  addonName?: string;
}

interface WatchLinksResponse {
  configured: boolean;
  cached: boolean;
  links: WatchDeepLink[];
  error?: string;
}

export function useWatchLinks({
  contentType,
  tmdbId,
  country,
  enabled,
}: {
  contentType: 'movie' | 'series';
  tmdbId: number;
  country: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ['watch-links', contentType, tmdbId, country],
    queryFn: async () => {
      const params = new URLSearchParams({ country });
      const res = await fetch(`/api/watch-links/${contentType}/${tmdbId}?${params}`);
      const text = await res.text();
      const contentTypeHeader = res.headers.get('content-type') ?? '';
      if (!contentTypeHeader.includes('application/json')) {
        throw new Error('Deep-link endpoint did not return JSON. Restart the dev server so the backend route is available.');
      }
      const body = JSON.parse(text) as WatchLinksResponse;
      if (!res.ok) throw new Error(body.error ?? 'Failed to load watch links');
      return body;
    },
    enabled,
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
}
