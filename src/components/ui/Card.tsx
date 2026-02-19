import { Link } from 'react-router-dom';
import { posterUrl } from '../../utils/image';
import { formatDate } from '../../utils/date';
import CountdownBadge from './CountdownBadge';

interface Props {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate?: string;
  voteAverage?: number;
  type: 'movie' | 'series';
  showCountdown?: boolean;
  subtitle?: string;
}

export default function Card({
  id, title, posterPath, releaseDate, voteAverage, type, showCountdown, subtitle,
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
      <div className="p-3">
        <h3 className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>
        )}
        {releaseDate && (
          <p className="text-xs text-text-muted mt-1">{formatDate(releaseDate)}</p>
        )}
      </div>
    </Link>
  );
}
