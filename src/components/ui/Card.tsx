import type { MouseEventHandler } from 'react';
import { Link } from 'react-router-dom';
import { posterUrl } from '../../utils/image';
import { formatDate } from '../../utils/date';
import CountdownBadge from './CountdownBadge';
import { statusLabel } from '../../utils/status';
import type { NewSeasonState, WatchedStatus } from '../../db/models';

export interface NewSeasonInfo {
  number: number;
  state: NewSeasonState;
}

interface Props {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate?: string;
  voteAverage?: number;
  type: 'movie' | 'series';
  showCountdown?: boolean;
  subtitle?: string;
  compact?: boolean;
  status?: WatchedStatus | null;
  progressLabel?: string;
  newSeason?: NewSeasonInfo | null;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  scrollRestoreId?: string;
}

function PlaceholderPoster() {
  return (
    <div className="flex h-full w-full items-center justify-center text-text-muted">
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
        <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
      </svg>
    </div>
  );
}

/** Artwork-first card: the poster is the surface, the caption sits underneath. */
export default function Card({
  id, title, posterPath, releaseDate, voteAverage, type, showCountdown, subtitle, compact, status, progressLabel, newSeason, onClick, scrollRestoreId,
}: Props) {
  const url = posterUrl(posterPath, 'w342');
  const linkTo = type === 'movie' ? `/movie/${id}` : `/series/${id}`;
  const cornerLabel = newSeason
    ? `S${newSeason.number}${newSeason.state === 'airing' ? ' new' : ''}`
    : null;
  const bottomLabel = newSeason ? null : progressLabel;
  const libraryLabel = status ? statusLabel(status) : null;

  return (
    <Link
      to={linkTo}
      onClick={onClick}
      data-scroll-restore-id={scrollRestoreId}
      className="group/card block rounded-xl outline-none transition-transform duration-100 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-overlay shadow-card ring-1 ring-inset ring-hairline transition-[transform,box-shadow] duration-300 ease-out group-hover/card:-translate-y-0.5 group-hover/card:shadow-[0_18px_40px_-16px_rgb(0_0_0/0.6)]">
        {url ? (
          <img
            src={url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
          />
        ) : (
          <PlaceholderPoster />
        )}
        {libraryLabel && (
          <span className="material-chip t-micro absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1">
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5 9-10" />
            </svg>
            {libraryLabel}
          </span>
        )}
        {cornerLabel && (
          <span
            className="t-micro absolute left-1.5 top-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-warning px-1.5 py-1 uppercase text-on-warning shadow-chip"
            title={
              newSeason!.state === 'airing'
                ? `Season ${newSeason!.number} is airing`
                : `Season ${newSeason!.number} announced`
            }
          >
            <span aria-hidden="true">★</span>
            {cornerLabel}
          </span>
        )}
        {showCountdown && releaseDate && (
          <div className="absolute right-1.5 top-1.5">
            <CountdownBadge dateStr={releaseDate} />
          </div>
        )}
        {voteAverage != null && voteAverage > 0 && (
          <span className="material-chip t-micro num absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-1">
            <span className="text-warning" aria-hidden="true">★</span> {voteAverage.toFixed(1)}
          </span>
        )}
        {bottomLabel && (
          <span className="t-micro num absolute bottom-1.5 right-1.5 rounded-md bg-accent px-1.5 py-1 text-on-accent shadow-chip">
            {bottomLabel}
          </span>
        )}
      </div>
      <div className={compact ? 'px-0.5 pt-1.5' : 'px-0.5 pt-2'}>
        <h3 className={`${compact ? 'text-[0.75rem] sm:text-[0.8125rem]' : 'text-[0.875rem]'} truncate font-semibold leading-snug tracking-[-0.005em] text-text-primary`}>
          {title}
        </h3>
        {subtitle && (
          <p className={`t-caption num mt-0.5 truncate ${compact ? 'hidden sm:block' : ''}`}>{subtitle}</p>
        )}
        {releaseDate && (
          <p className={`t-caption num mt-0.5 truncate whitespace-nowrap text-text-muted ${compact ? 'hidden sm:block' : ''}`}>{formatDate(releaseDate)}</p>
        )}
      </div>
    </Link>
  );
}
