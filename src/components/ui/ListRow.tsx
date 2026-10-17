import type { MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { posterUrl } from '../../utils/image';

interface Props {
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'series';
  /** Secondary line under the title; defaults to the content type. */
  meta?: ReactNode;
  /** Trailing value (progress, rating, status). */
  trailing?: ReactNode;
  progressLabel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  scrollRestoreId?: string;
}

/** Full-width list row: the whole row is the link and gives press feedback. */
export default function ListRow({ id, title, posterPath, type, meta, trailing, progressLabel, onClick, scrollRestoreId }: Props) {
  const url = posterUrl(posterPath, 'w92');
  const linkTo = type === 'movie' ? `/movie/${id}` : `/series/${id}`;

  return (
    <Link
      to={linkTo}
      onClick={onClick}
      data-scroll-restore-id={scrollRestoreId}
      className="group flex min-h-16 items-center gap-3 px-3 py-2.5 transition-[background-color,transform] duration-100 active:scale-[0.99] active:bg-fill md:px-4 [@media(hover:hover)]:hover:bg-fill"
    >
      <div className="aspect-[2/3] w-10 flex-shrink-0 overflow-hidden rounded-md bg-surface-overlay ring-1 ring-inset ring-hairline">
        {url ? (
          <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
              <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-text-primary">
          {title}
        </span>
        <span className="t-caption block truncate">{meta ?? (type === 'movie' ? 'Movie' : 'Series')}</span>
      </div>
      {trailing}
      {progressLabel && (
        <span className="t-micro num flex-shrink-0 rounded-md bg-accent/15 px-2 py-1 text-accent">
          {progressLabel}
        </span>
      )}
      <svg className="h-4 w-4 shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}
