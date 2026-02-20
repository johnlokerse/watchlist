import type { TMDBCountryProviders } from '../../api/types';
import { logoUrl } from '../../utils/image';

interface Props {
  providers: TMDBCountryProviders | undefined;
  country: string;
  userServiceIds?: number[];
}

export default function WatchProvidersTab({ providers, country, userServiceIds = [] }: Props) {
  if (!providers) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p className="text-lg mb-1">📺</p>
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
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            On Your Services
          </h3>
          <div className="flex flex-wrap gap-3">
            {myStreamingProviders.map((p) => {
              const logo = logoUrl(p.logo_path, 'w92');
              return (
                <div
                  key={p.provider_id}
                  className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 border border-accent/30"
                >
                  {logo && (
                    <img src={logo} alt={p.provider_name} className="w-8 h-8 rounded-md" loading="lazy" />
                  )}
                  <span className="text-sm font-medium">{p.provider_name}</span>
                  <span className="text-accent text-xs font-bold">✓</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {providers.flatrate && providers.flatrate.length > 0 && (
        <ProviderGroup title="Stream" providers={providers.flatrate} userServiceIds={userServiceIds} />
      )}
      {providers.rent && providers.rent.length > 0 && (
        <ProviderGroup title="Rent" providers={providers.rent} userServiceIds={[]} />
      )}
      {providers.buy && providers.buy.length > 0 && (
        <ProviderGroup title="Buy" providers={providers.buy} userServiceIds={[]} />
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
          className="inline-block px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm font-medium hover:bg-accent/25 transition"
        >
          View on JustWatch ↗
        </a>
      )}
      <p className="text-xs text-text-muted">Provider data sourced from JustWatch via TMDB.</p>
    </div>
  );
}

function ProviderGroup({
  title,
  providers,
  userServiceIds,
}: {
  title: string;
  providers: { provider_id: number; provider_name: string; logo_path: string }[];
  userServiceIds: number[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => {
          const logo = logoUrl(p.logo_path, 'w92');
          const isMyService = userServiceIds.includes(p.provider_id);
          return (
            <div
              key={p.provider_id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${
                isMyService
                  ? 'bg-accent/10 border-accent/50'
                  : 'bg-surface-raised border-border-subtle'
              }`}
            >
              {logo && (
                <img src={logo} alt={p.provider_name} className="w-8 h-8 rounded-md" loading="lazy" />
              )}
              <span className="text-sm">{p.provider_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
