import { useState } from 'react';
import { useUpcomingFromLibrary, usePlannedMovies } from '../db/hooks';
import SegmentedControl from '../components/ui/SegmentedControl';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';

type ContentTab = 'movies' | 'series';

export default function UpcomingPage() {
  const [tab, setTab] = useState<ContentTab>('movies');

  const movies = useUpcomingFromLibrary('movie');
  const series = useUpcomingFromLibrary('series');
  const plannedMovies = usePlannedMovies();
  const items = tab === 'movies' ? movies : series;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Upcoming</h1>
        <SegmentedControl
          options={[
            { value: 'movies', label: 'Movies' },
            { value: 'series', label: 'Series' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as ContentTab)}
        />
      </div>

      {items === undefined ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-2">📅</p>
          <p className="font-medium mb-1">Nothing upcoming yet</p>
          <p className="text-sm">
            {tab === 'movies'
              ? "Add unreleased movies to your library and they'll appear here."
              : "Series you're watching or plan to watch will appear here."}
          </p>
        </div>
      ) : (
        <CardGrid>
          {items.map((item) => (
            <Card
              key={item.id}
              id={item.tmdbId}
              title={item.title}
              posterPath={item.posterPath}
              releaseDate={item.releaseDate ?? ''}
              voteAverage={0}
              type={item.contentType}
              showCountdown={tab === 'movies'}
            />
          ))}
        </CardGrid>
      )}

      {tab === 'movies' && plannedMovies !== undefined && plannedMovies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Planned</h2>
          <CardGrid>
            {plannedMovies.map((item) => (
              <Card
                key={item.id}
                id={item.tmdbId}
                title={item.title}
                posterPath={item.posterPath}
                releaseDate={item.releaseDate ?? ''}
                voteAverage={0}
                type={item.contentType}
                showCountdown={false}
              />
            ))}
          </CardGrid>
        </div>
      )}
    </div>
  );
}
