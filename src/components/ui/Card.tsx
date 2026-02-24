import { Link } from 'react-router-dom';
import { posterUrl } from '../../utils/image';
import { formatDate } from '../../utils/date';
import CountdownBadge from './CountdownBadge';
import type { WatchedStatus } from '../../db/models';

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
}

function statusLabel(status: WatchedStatus): string | null {
  if (status === 'watched') return 'Watched';
  if (status === 'plan_to_watch' || status === 'watching') return 'In Library';
  return null;
}

export default function Card({
  id, title, posterPath, releaseDate, voteAverage, type, showCountdown, subtitle, compact, status,
}: Props) {
  const url = posterUrl(posterPath, 'w342');
  const linkTo = type === 'movie' ? `/movie/${id}` : `/series/${id}`;

  return (
    <Link
      to={linkTo}
      className="group block bg-surface-raised rounded-xl overflow-hidden border border-border-subtle hover:border-accent/40 transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      <div className="aspect-[2/3] relative bg-surface-overlay">
        {url ? (
          <img
            src={url}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-text-muted">
            🎬
          </div>
        )}
        {status && statusLabel(status) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg drop-shadow">{statusLabel(status)}</span>
          </div>
        )}
        {showCountdown && releaseDate && (
          <div className="absolute top-2 right-2">
            <CountdownBadge dateStr={releaseDate} />
          </div>
        )}
        {voteAverage != null && voteAverage > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-xs font-semibold px-2 py-0.5 rounded-md text-yellow-400">
            ★ {voteAverage.toFixed(1)}
          </div>
        )}
      </div>
      <div className={compact ? 'p-1.5 sm:p-3' : 'p-3'}>
        <h3 className={`${compact ? 'text-xs sm:text-sm' : 'text-sm'} font-semibold truncate group-hover:text-accent transition-colors`}>
          {title}
        </h3>
        {subtitle && (
          <p className={`text-xs text-text-muted mt-0.5 truncate ${compact ? 'hidden sm:block' : ''}`}>{subtitle}</p>
        )}
        {releaseDate && (
          <p className={`text-xs text-text-muted mt-1 ${compact ? 'hidden sm:block' : ''}`}>{formatDate(releaseDate)}</p>
        )}
      </div>
    </Link>
  );
}
