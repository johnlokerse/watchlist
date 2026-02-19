interface Props {
  overview: string;
  genres: { id: number; name: string }[];
  releaseDate?: string;
  runtime?: number | null;
  status?: string;
  imdbId?: string | null;
  tmdbId: number;
  type: 'movie' | 'series';
}

export default function OverviewTab({ overview, genres, releaseDate, runtime, status, imdbId, tmdbId, type }: Props) {
  return (
    <div className="space-y-4">
      {overview && (
        <p className="text-text-secondary leading-relaxed">{overview}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <span key={g.id} className="px-3 py-1 bg-surface-raised rounded-full text-xs text-text-secondary border border-border-subtle">
            {g.name}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* External links */}
      <div className="flex gap-3 pt-2">
        {imdbId && (
          <a
            href={`https://www.imdb.com/title/${imdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition"
          >
            IMDb ↗
          </a>
        )}
        <a
          href={`https://www.themoviedb.org/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm font-medium hover:bg-accent/25 transition"
        >
          TMDB ↗
        </a>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised rounded-lg p-3">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
