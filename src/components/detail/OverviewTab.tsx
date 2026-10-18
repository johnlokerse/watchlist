import ReleaseTimeline from './ReleaseTimeline';
import RecommendedSection from './RecommendedSection';
import type { ReleaseTimelineEvent } from '../../utils/releaseTimeline';

interface Props {
  overview: string;
  genres: { id: number; name: string }[];
  releaseDate?: string;
  runtime?: number | null;
  status?: string;
  imdbId?: string | null;
  tmdbId: number;
  type: 'movie' | 'series';
  timelineEvents?: ReleaseTimelineEvent[];
}

export default function OverviewTab({
  overview,
  genres,
  releaseDate,
  runtime,
  status,
  imdbId,
  tmdbId,
  type,
  timelineEvents = [],
}: Props) {
  return (
    <div className="space-y-6">
      {overview && (
        <p className="t-body max-w-[68ch] text-text-secondary">{overview}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <span key={g.id} className="rounded-full bg-fill px-3 py-1 text-[0.8125rem] font-medium text-text-secondary">
            {g.name}
          </span>
        ))}
      </div>

      <div className="grouped grid grid-cols-2 md:grid-cols-4 [&>*+*]:before:hidden">
        {status && (
          <InfoBlock label="Status" value={status} />
        )}
        {releaseDate && (
          <InfoBlock label="Release Date" value={new Date(releaseDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
        )}
        {runtime != null && runtime > 0 && (
          <InfoBlock label="Runtime" value={`${Math.floor(runtime / 60)}h ${runtime % 60}m`} />
        )}
      </div>

      {timelineEvents.length > 0 && (
        <ReleaseTimeline events={timelineEvents} />
      )}

      {/* External links */}
      <div className="flex gap-2">
        {imdbId && (
          <a
            href={`https://www.imdb.com/title/${imdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-9 items-center rounded-full bg-fill px-4 text-[0.875rem] font-semibold text-text-primary hover:bg-fill-strong"
          >
            IMDb ↗
          </a>
        )}
        <a
          href={`https://www.themoviedb.org/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex min-h-9 items-center rounded-full bg-fill px-4 text-[0.875rem] font-semibold text-text-primary hover:bg-fill-strong"
        >
          TMDB ↗
        </a>
      </div>

      <RecommendedSection tmdbId={tmdbId} type={type} />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="t-label mb-1">{label}</p>
      <p className="t-callout font-semibold text-text-primary">{value}</p>
    </div>
  );
}
