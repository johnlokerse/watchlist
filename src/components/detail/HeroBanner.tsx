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
    <div className="relative mb-6 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
      {/* Backdrop */}
      <div className="relative h-48 overflow-hidden md:h-64">
        {backdrop ? (
          <img src={backdrop} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full bg-surface-overlay" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-raised via-surface-raised/70 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative -mt-24 flex gap-4 px-4 pb-4 md:-mt-32 md:gap-6 md:px-6 md:pb-6">
        {/* Poster */}
        <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-overlay shadow-2xl md:w-40">
          {poster ? (
            <img src={poster} alt={title} className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-surface-overlay text-text-muted">
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
                <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 pt-16 md:pt-24">
          <h1 className="text-xl font-bold leading-tight md:text-3xl">{title}</h1>
          {tagline && (
            <p className="text-text-secondary text-sm italic mt-1">{tagline}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary md:text-sm">
            {facts.map((f) => (
              <span key={f.label} className="rounded-md border border-border-subtle bg-surface/45 px-2 py-1">
                <span className="text-text-muted">{f.label}</span> {f.value}
              </span>
            ))}
          </div>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
