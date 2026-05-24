import type { TMDBCountryProviders } from '../../api/types';
import type { WatchDeepLink } from '../../api/watchLinks';
import { logoUrl } from '../../utils/image';
import { isIOSStandalone } from '../../utils/platform';
import { getIOSAppUrl } from '../../utils/streamingDeepLinks';

interface Props {
  providers: TMDBCountryProviders | undefined;
  country: string;
  userServiceIds?: number[];
  deepLinksConfigured?: boolean;
  deepLinks?: WatchDeepLink[];
  deepLinksLoading?: boolean;
  deepLinksError?: string | null;
}

export default function WatchProvidersTab({
  providers,
  country,
  userServiceIds = [],
  deepLinksConfigured = false,
  deepLinks = [],
  deepLinksLoading = false,
  deepLinksError = null,
}: Props) {
  if (!providers) {
    return (
      <div className="app-panel py-8 text-center text-text-muted">
        <p className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg border border-border-subtle bg-surface-overlay text-accent">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="12" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </p>
        <p>No watch provider information available for {country}.</p>
      </div>
    );
  }

  const myStreamingProviders = userServiceIds.length > 0
    ? (providers.flatrate ?? []).filter((p) => userServiceIds.includes(p.provider_id))
    : [];

  return (
    <div className="space-y-6">
      {myStreamingProviders.length > 0 && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            On Your Services
          </h3>
          <div className="flex flex-wrap gap-3">
            {myStreamingProviders.map((p) => {
              const logo = logoUrl(p.logo_path, 'w92');
              const match = findProviderLink(p, deepLinks, ['subscription', 'free', 'addon']);
              return (
                <ProviderLink
                  key={p.provider_id}
                  href={match?.href}
                  serviceId={match?.serviceId}
                  providerName={p.provider_name}
                  sectionLabel="your services"
                  className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 border border-accent/30"
                >
                  {logo && (
                    <img src={logo} alt={p.provider_name} className="w-8 h-8 rounded-md" loading="lazy" />
                  )}
                  <span className="text-sm font-medium">{p.provider_name}</span>
                  <span className="text-accent text-xs font-bold">✓</span>
                </ProviderLink>
              );
            })}
          </div>
        </div>
      )}

      {providers.flatrate && providers.flatrate.length > 0 && (
        <ProviderGroup title="Stream" providers={providers.flatrate} userServiceIds={userServiceIds} deepLinks={deepLinks} preferredTypes={['subscription', 'free', 'addon']} />
      )}
      {providers.rent && providers.rent.length > 0 && (
        <ProviderGroup title="Rent" providers={providers.rent} userServiceIds={[]} deepLinks={deepLinks} preferredTypes={['rent']} />
      )}
      {providers.buy && providers.buy.length > 0 && (
        <ProviderGroup title="Buy" providers={providers.buy} userServiceIds={[]} deepLinks={deepLinks} preferredTypes={['buy']} />
      )}
      {!providers.flatrate?.length && !providers.rent?.length && !providers.buy?.length && (
        <div className="text-center py-8 text-text-muted">
          <p>No providers found for {country}.</p>
        </div>
      )}
      {providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25"
        >
          View on JustWatch ↗
        </a>
      )}
      {deepLinksLoading && (
        <p className="text-xs text-text-muted">Finding exact provider links…</p>
      )}
      {!deepLinksConfigured && (
        <p className="text-xs text-text-muted">Add a Streaming Availability API key in Settings to make provider chips open exact watch pages.</p>
      )}
      {deepLinksConfigured && !deepLinksLoading && !deepLinksError && deepLinks.length === 0 && (
        <p className="text-xs text-text-muted">No exact provider links were found for this title in {country}.</p>
      )}
      {deepLinksError && (
        <p className="text-xs text-danger">Exact provider links unavailable: {deepLinksError}</p>
      )}
      <p className="text-xs text-text-muted">Provider data sourced from JustWatch via TMDB.</p>
    </div>
  );
}

function ProviderGroup({
  title,
  providers,
  userServiceIds,
  deepLinks,
  preferredTypes,
}: {
  title: string;
  providers: { provider_id: number; provider_name: string; logo_path: string }[];
  userServiceIds: number[];
  deepLinks: WatchDeepLink[];
  preferredTypes: string[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => {
          const logo = logoUrl(p.logo_path, 'w92');
          const isMyService = userServiceIds.includes(p.provider_id);
          const match = findProviderLink(p, deepLinks, preferredTypes);
          return (
            <ProviderLink
              key={p.provider_id}
              href={match?.href}
              serviceId={match?.serviceId}
              providerName={p.provider_name}
              sectionLabel={title}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${
                isMyService
                  ? 'bg-accent/10 border-accent/50'
                  : 'bg-surface-raised border-border-subtle'
              }`}
            >
              {logo && (
                <img src={logo} alt={p.provider_name} className="h-8 w-8 rounded-md" loading="lazy" />
              )}
              <span className="text-sm">{p.provider_name}</span>
            </ProviderLink>
          );
        })}
      </div>
    </div>
  );
}

function findProviderLink(
  provider: { provider_id: number; provider_name: string },
  links: WatchDeepLink[],
  preferredTypes: string[],
): { href: string; serviceId: string } | undefined {
  const providerName = normalizeProviderName(provider.provider_name);
  const matches = links.filter((link) => {
    if (link.tmdbProviderIds.includes(provider.provider_id)) return true;
    const linkName = normalizeProviderName(link.serviceName);
    return linkName === providerName || providerName.includes(linkName) || linkName.includes(providerName);
  });
  const chosen = matches.find((link) => preferredTypes.includes(link.type)) ?? matches[0];
  if (!chosen) return undefined;
  const href = chosen.videoLink ?? chosen.link;
  if (!href) return undefined;
  return { href, serviceId: chosen.serviceId };
}

function normalizeProviderName(name: string) {
  return name
    .toLowerCase()
    .replace(/\+/g, ' plus')
    .replace(/\b(video|channel|channels|store|movies|amazon)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ProviderLink({
  href,
  serviceId,
  providerName,
  sectionLabel,
  className,
  children,
}: {
  href: string | undefined;
  serviceId?: string;
  providerName: string;
  sectionLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // On iOS Home Screen PWAs, target="_blank" opens an in-app browser that
    // bypasses Universal Links, so streaming providers always open as a
    // website instead of the native app. Intercept the click and route the
    // navigation top-level — optionally via a known custom scheme — so iOS
    // hands off to the installed app when possible.
    if (!isIOSStandalone()) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const appUrl = getIOSAppUrl(serviceId, href);
    if (!appUrl) {
      window.location.href = href;
      return;
    }

    let fallbackFired = false;
    const fallback = window.setTimeout(() => {
      fallbackFired = true;
      window.location.href = href;
    }, 1500);
    const onVisibilityChange = () => {
      if (document.hidden && !fallbackFired) {
        window.clearTimeout(fallback);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.location.href = appUrl;
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={`Open ${providerName} from ${sectionLabel}`}
      title={`Open ${providerName}`}
      className={`${className} hover:border-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent/50`}
    >
      {children}
    </a>
  );
}
