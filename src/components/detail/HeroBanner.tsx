import { useNavigate } from 'react-router-dom';
import { backdropUrl, posterUrl } from '../../utils/image';

interface Props {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  tagline?: string;
  /** Short facts rendered as one caption line, e.g. ["2008", "Drama, Crime", "5 seasons"]. */
  meta: string[];
  children?: React.ReactNode;
}

/**
 * Artwork-led header: the backdrop bleeds to the screen edges on phones (under the
 * translucent status bar) and fades into the page; the back button floats on a material chip.
 */
export default function HeroBanner({ title, posterPath, backdropPath, tagline, meta, children }: Props) {
  const navigate = useNavigate();
  const backdrop = backdropUrl(backdropPath);
  const poster = posterUrl(posterPath, 'w500');

  return (
    <div className="relative -mx-4 -mt-[calc(1rem+var(--safe-area-top))] mb-6 md:mx-0 md:mt-0">
      <div className="relative h-[clamp(240px,42vh,400px)] overflow-hidden md:h-[340px] md:rounded-[22px]">
        {backdrop ? (
          <img src={backdrop} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full bg-surface-overlay" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/55 to-surface/0" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent md:hidden" />
      </div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="material-chip press absolute left-4 top-[calc(0.75rem+var(--safe-area-top))] z-10 inline-flex h-9 items-center gap-0.5 rounded-full pl-2 pr-3.5 text-[0.9375rem] font-semibold md:left-4 md:top-4"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <div className="relative -mt-28 flex items-end gap-4 px-4 md:-mt-36 md:gap-6 md:px-8">
        <div className="w-[6.5rem] shrink-0 overflow-hidden rounded-xl bg-surface-overlay shadow-card ring-1 ring-inset ring-hairline md:w-40">
          {poster ? (
            <img src={poster} alt={title} className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center text-text-muted">
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
                <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
              </svg>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <h1 className="t-title text-text-primary">{title}</h1>
          {tagline && <p className="t-callout mt-1 italic text-text-secondary">{tagline}</p>}
          <p className="t-caption num mt-1.5">
            {meta.map((fact, i) => (
              <span key={fact}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <span className="whitespace-nowrap">{fact}</span>
              </span>
            ))}
          </p>
        </div>
      </div>

      {children && <div className="mt-5 px-4 md:px-8">{children}</div>}
    </div>
  );
}
