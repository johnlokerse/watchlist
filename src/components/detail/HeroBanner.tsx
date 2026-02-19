import { backdropUrl, posterUrl } from '../../utils/image';

interface Props {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  tagline?: string;
  facts: { label: string; value: string }[];
  children?: React.ReactNode;
}

export default function HeroBanner({ title, posterPath, backdropPath, tagline, facts, children }: Props) {
  const backdrop = backdropUrl(backdropPath);
  const poster = posterUrl(posterPath, 'w500');

  return (
    <div className="relative -mx-4 md:-mx-6 mb-6">
      {/* Backdrop */}
      <div className="h-48 md:h-72 relative overflow-hidden">
        {backdrop ? (
          <img src={backdrop} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-surface-overlay" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative -mt-24 md:-mt-32 px-4 md:px-6 flex gap-4 md:gap-6">
        {/* Poster */}
        <div className="shrink-0 w-28 md:w-40 rounded-xl overflow-hidden shadow-2xl border-2 border-border-subtle">
          {poster ? (
            <img src={poster} alt={title} className="w-full aspect-[2/3] object-cover" />
          ) : (
            <div className="w-full aspect-[2/3] bg-surface-overlay flex items-center justify-center text-4xl text-text-muted">
              🎬
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-16 md:pt-24">
          <h1 className="text-xl md:text-3xl font-bold leading-tight">{title}</h1>
          {tagline && (
            <p className="text-text-secondary text-sm italic mt-1">{tagline}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs md:text-sm text-text-secondary">
            {facts.map((f) => (
              <span key={f.label}>
                <span className="text-text-muted">{f.label}:</span> {f.value}
              </span>
            ))}
          </div>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
