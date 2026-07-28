import type { MouseEventHandler } from 'react';
import { Link } from 'react-router-dom';
import { posterUrl } from '../../utils/image';
import { formatDate } from '../../utils/date';
import CountdownBadge from './CountdownBadge';
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

function statusLabel(status: WatchedStatus): string | null {
  if (status === 'watched') return 'Watched';
  if (status === 'plan_to_watch' || status === 'watching') return 'In Library';
  return null;
}

function PlaceholderPoster() {
  return (
    <div className="flex h-full w-full items-center justify-center text-text-muted">
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
        <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
      </svg>
    </div>
  );
}

export default function Card({
  id, title, posterPath, releaseDate, voteAverage, type, showCountdown, subtitle, compact, status, progressLabel, newSeason, onClick, scrollRestoreId,
}: Props) {
  const url = posterUrl(posterPath, 'w342');
  const linkTo = type === 'movie' ? `/movie/${id}` : `/series/${id}`;
  const cornerLabel = newSeason
    ? `S${newSeason.number}${newSeason.state === 'airing' ? ' new' : ''}`
    : null;
  const bottomLabel = newSeason ? null : progressLabel;

  return (
    <Link
      to={linkTo}
      onClick={onClick}
      data-scroll-restore-id={scrollRestoreId}
      className="group/card block overflow-hidden rounded-lg border border-border-subtle bg-surface-raised shadow-[0_14px_40px_rgb(0_0_0_/_0.16)] transition-all hover:-translate-y-0.5 hover:border-accent/45 hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      <div className="relative aspect-[2/3] bg-surface-overlay">
        {url ? (
          <img
            src={url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover/card:scale-[1.025]"
          />
        ) : (
          <PlaceholderPoster />
        )}
        {status && statusLabel(status) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="rounded-md border border-white/15 bg-black/65 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
              {statusLabel(status)}
            </span>
          </div>
        )}
        {cornerLabel && (
          <div
            className="absolute left-2 top-2 flex items-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-warning/90 px-1.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wide text-[#1a1205] shadow"
            title={
              newSeason!.state === 'airing'
                ? `Season ${newSeason!.number} is airing`
                : `Season ${newSeason!.number} announced`
            }
          >
            <span className="text-[9px] leading-none text-white" aria-hidden="true">★</span>
            {cornerLabel}
          </div>
        )}
        {showCountdown && releaseDate && (
          <div className="absolute right-2 top-2">
            <CountdownBadge dateStr={releaseDate} />
          </div>
        )}
        {voteAverage != null && voteAverage > 0 && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-warning backdrop-blur-sm">
            ★ {voteAverage.toFixed(1)}
          </div>
        )}
        {bottomLabel && (
          <div className="absolute bottom-2 right-2 rounded-md bg-surface-overlay/90 px-2 py-0.5 text-xs font-semibold text-accent backdrop-blur-sm">
            {bottomLabel}
          </div>
        )}
      </div>
      <div className={compact ? 'p-2 sm:p-3' : 'p-3'}>
        <h3 className={`${compact ? 'text-xs sm:text-sm' : 'text-sm'} truncate font-semibold leading-snug text-text-primary transition-colors group-hover/card:text-accent`}>
          {title}
        </h3>
        {subtitle && (
          <p className={`mt-1 truncate text-xs text-text-secondary ${compact ? 'hidden sm:block' : ''}`}>{subtitle}</p>
        )}
        {releaseDate && (
          <p className={`mt-1 truncate whitespace-nowrap text-xs text-text-muted ${compact ? 'hidden sm:block' : ''}`}>{formatDate(releaseDate)}</p>
        )}
      </div>
    </Link>
  );
}
