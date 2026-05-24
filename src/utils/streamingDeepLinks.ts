// Maps a Streaming Availability serviceId to an iOS custom-scheme deep link
// derived from the provider's web URL. Returns undefined when no reliable
// app scheme is known — callers should fall back to top-level navigation of
// the web URL so iOS universal links can route to the native app instead.

type SchemeBuilder = (webUrl: string) => string | undefined;

const builders: Record<string, SchemeBuilder> = {
  netflix: (url) => {
    const match = url.match(/netflix\.com\/(?:title|watch)\/(\d+)/i);
    if (match) return `nflx://www.netflix.com/title/${match[1]}`;
    return 'nflx://';
  },
  youtube: (url) => url.replace(/^https?:\/\//i, 'youtube://'),
  apple: (url) => {
    // Apple TV universal links already open the app reliably when navigated
    // top-level. Force the dedicated scheme to skip the Safari hop.
    return url.replace(/^https?:\/\/tv\.apple\.com/i, 'videos://tv.apple.com');
  },
};

export function getIOSAppUrl(serviceId: string | undefined, webUrl: string): string | undefined {
  if (!serviceId) return undefined;
  const builder = builders[serviceId.toLowerCase()];
  return builder?.(webUrl);
}
