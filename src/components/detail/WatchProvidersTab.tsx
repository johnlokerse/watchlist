import type { TMDBCountryProviders } from '../../api/types';
import { logoUrl } from '../../utils/image';

interface Props {
  providers: TMDBCountryProviders | undefined;
  country: string;
}

export default function WatchProvidersTab({ providers, country }: Props) {
  if (!providers) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p className="text-lg mb-1">📺</p>
        <p>No watch provider information available for {country}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {providers.flatrate && providers.flatrate.length > 0 && (
        <ProviderGroup title="Stream" providers={providers.flatrate} />
      )}
      {providers.rent && providers.rent.length > 0 && (
        <ProviderGroup title="Rent" providers={providers.rent} />
      )}
      {providers.buy && providers.buy.length > 0 && (
        <ProviderGroup title="Buy" providers={providers.buy} />
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

function ProviderGroup({ title, providers }: { title: string; providers: { provider_id: number; provider_name: string; logo_path: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => {
          const logo = logoUrl(p.logo_path, 'w92');
          return (
            <div key={p.provider_id} className="flex items-center gap-2 bg-surface-raised rounded-lg px-3 py-2 border border-border-subtle">
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
