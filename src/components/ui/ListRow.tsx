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
      className="flex items-center gap-3 px-2 py-1.5 hover:bg-surface-overlay/50 transition-colors group rounded-md"
    >
      <div className="w-8 aspect-[2/3] rounded overflow-hidden bg-surface-overlay flex-shrink-0">
        {url ? (
          <img src={url} alt={title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">🎬</div>
        )}
      </div>
      <span className="text-sm truncate group-hover:text-accent transition-colors flex-1">
        {title}
      </span>
      {progressLabel && (
        <span className="text-xs font-medium text-accent flex-shrink-0">
          {progressLabel}
        </span>
      )}
    </Link>
  );
}
