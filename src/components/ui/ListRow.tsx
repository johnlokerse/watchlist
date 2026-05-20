import { Link } from 'react-router-dom';
import { posterUrl } from '../../utils/image';

interface Props {
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'series';
  progressLabel?: string;
}

export default function ListRow({ id, title, posterPath, type, progressLabel }: Props) {
  const url = posterUrl(posterPath, 'w92');
  const linkTo = type === 'movie' ? `/movie/${id}` : `/series/${id}`;

  return (
    <Link
      to={linkTo}
      className="database-row group flex items-center gap-3 px-3 py-2 transition-colors"
    >
      <div className="aspect-[2/3] w-9 flex-shrink-0 overflow-hidden rounded-md bg-surface-overlay">
        {url ? (
          <img src={url} alt={title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
              <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text-primary transition-colors group-hover:text-accent">
          {title}
        </span>
        <span className="text-xs capitalize text-text-muted">{type}</span>
      </div>
      {progressLabel && (
        <span className="flex-shrink-0 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
          {progressLabel}
        </span>
      )}
    </Link>
  );
}
