import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUpcomingFromLibrary, usePlannedMovies } from '../db/hooks';
import { useSeriesDetailBatch } from '../api/tmdb';
import { useSettings } from '../hooks/useSettings';
import SegmentedControl from '../components/ui/SegmentedControl';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import SkeletonCard from '../components/ui/SkeletonCard';

type ContentTab = 'movies' | 'series';

const UPCOMING_STATUSES = new Set(['Returning Series', 'In Production', 'Planned']);
const ENDED_STATUSES = new Set(['Ended', 'Canceled']);

function seriesStatusLabel(status: string): string {
  switch (status) {
    case 'Returning Series': return 'New season coming';
    case 'In Production': return 'In production';
    case 'Planned': return 'Announced';
    default: return status;
  }
}

export default function UpcomingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const tabParam = searchParams.get('tab');
  const tab: ContentTab = tabParam === 'series' ? 'series' : 'movies';
  const setTab = (nextTab: ContentTab) => {
    if (nextTab === 'series') {
      setSearchParams({ tab: 'series' });
      return;
    }
    setSearchParams({});
  };

  const movies = useUpcomingFromLibrary('movie');
  const series = useUpcomingFromLibrary('series');
  const plannedMovies = usePlannedMovies();

  const today = new Date().toISOString().slice(0, 10);

  // Fetch TMDB details for all series in the library (enabled only on series tab)
  const seriesIds = tab === 'series' ? (series ?? []).map((i) => i.tmdbId) : [];
  const seriesDetailQueries = useSeriesDetailBatch(seriesIds);

  const isSeriesDetailsLoading =
    series !== undefined &&
    series.length > 0 &&
    seriesDetailQueries.some((q) => q.isLoading);

  const { upcomingEpisodes, announcedSeries, endedSeries } = useMemo(() => {
    if (!series || series.length === 0) {
      return { upcomingEpisodes: [], announcedSeries: [], endedSeries: [] };
    }

    const withDetails = series.map((item, idx) => ({
      item,
      detail: seriesDetailQueries[idx]?.data,
    }));

    // Series with a specific upcoming episode air date
    const upcomingEpisodes = withDetails
      .filter(({ detail }) => {
        const date = detail?.next_episode_to_air?.air_date;
        return date && date >= today;
      })
      .sort((a, b) => {
        const da = a.detail!.next_episode_to_air!.air_date!;
        const db = b.detail!.next_episode_to_air!.air_date!;
        return da.localeCompare(db);
      });

    // Series announced/in-production but without a specific episode date yet
    const announcedSeries = withDetails
      .filter(({ detail }) => {
        if (!detail) return false;
        const date = detail.next_episode_to_air?.air_date;
        if (date && date >= today) return false; // already in upcomingEpisodes
        return UPCOMING_STATUSES.has(detail.status);
      })
      .sort((a, b) => a.item.title.localeCompare(b.item.title));

    // Series that have ended or been canceled
    const endedSeries = withDetails
      .filter(({ detail }) => {
        if (!detail) return false;
        return ENDED_STATUSES.has(detail.status);
      })
      .sort((a, b) => a.item.title.localeCompare(b.item.title));

    return { upcomingEpisodes, announcedSeries, endedSeries };
  }, [series, seriesDetailQueries, today]);

  const moviesItems = movies;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">Release planning</p>
          <h1 className="page-title">Upcoming</h1>
        </div>
        <SegmentedControl
          options={[
            { value: 'movies', label: 'Movies' },
            { value: 'series', label: 'Series' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as ContentTab)}
        />
      </div>

      {/* ── Movies tab ── */}
      {tab === 'movies' && (
        <>
          {moviesItems === undefined ? (
            <div className="app-panel flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : moviesItems.length === 0 ? (
            <div className="app-panel py-16 text-center text-text-muted">
              <p className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg border border-border-subtle bg-surface-overlay text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
                  <path d="M8 2.8v4M16 2.8v4M3.5 9h17" />
                </svg>
              </p>
              <p className="font-medium mb-1">Nothing upcoming yet</p>
              <p className="text-sm">
                Add unreleased movies to your library and they'll appear here.
              </p>
            </div>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Release dates</h2>
                <span className="text-xs font-medium text-text-muted">{moviesItems.length} upcoming</span>
              </div>
              <CardGrid coverSize={settings.coverSize}>
                {moviesItems.map((item) => (
                  <Card
                    key={item.id}
                    id={item.tmdbId}
                    title={item.title}
                    posterPath={item.posterPath}
                    releaseDate={item.releaseDate ?? ''}
                    voteAverage={0}
                    type={item.contentType}
                    showCountdown={true}
                  />
                ))}
              </CardGrid>
            </section>
          )}

          {plannedMovies !== undefined && plannedMovies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Planned</h2>
                <span className="text-xs font-medium text-text-muted">{plannedMovies.length} items</span>
              </div>
              <CardGrid coverSize={settings.coverSize}>
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
        </>
      )}

      {/* ── Series tab ── */}
      {tab === 'series' && (
        <>
          {series === undefined || isSeriesDetailsLoading ? (
            series === undefined ? (
              <div className="app-panel flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <CardGrid coverSize={settings.coverSize}>
                {series.map((item) => (
                  <SkeletonCard key={item.id} />
                ))}
              </CardGrid>
            )
          ) : series.length === 0 ? (
            <div className="app-panel py-16 text-center text-text-muted">
              <p className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg border border-border-subtle bg-surface-overlay text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
                  <path d="M8 2.8v4M16 2.8v4M3.5 9h17" />
                </svg>
              </p>
              <p className="font-medium mb-1">Nothing upcoming yet</p>
              <p className="text-sm">
                Series on your watchlist with upcoming episodes will appear here.
              </p>
            </div>
          ) : upcomingEpisodes.length === 0 && announcedSeries.length === 0 && endedSeries.length === 0 ? (
            <div className="app-panel py-16 text-center text-text-muted">
              <p className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg border border-success/30 bg-success/10 text-success">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </p>
              <p className="font-medium mb-1">All caught up</p>
              <p className="text-sm">
                None of your series have upcoming episodes right now.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {upcomingEpisodes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Next episodes</h2>
                    <span className="text-xs font-medium text-text-muted">{upcomingEpisodes.length} items</span>
                  </div>
                  <CardGrid coverSize={settings.coverSize}>
                    {upcomingEpisodes.map(({ item, detail }) => {
                      const nextEp = detail!.next_episode_to_air!;
                      return (
                        <Card
                          key={item.id}
                          id={item.tmdbId}
                          title={item.title}
                          posterPath={item.posterPath}
                          releaseDate={nextEp.air_date ?? ''}
                          voteAverage={0}
                          type="series"
                          showCountdown={true}
                          subtitle={`S${nextEp.season_number}E${nextEp.episode_number}`}
                        />
                      );
                    })}
                  </CardGrid>
                </div>
              )}

              {announcedSeries.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Announced</h2>
                    <span className="text-xs font-medium text-text-muted">{announcedSeries.length} items</span>
                  </div>
                  <CardGrid coverSize={settings.coverSize}>
                    {announcedSeries.map(({ item, detail }) => (
                      <Card
                        key={item.id}
                        id={item.tmdbId}
                        title={item.title}
                        posterPath={item.posterPath}
                        releaseDate=""
                        voteAverage={0}
                        type="series"
                        showCountdown={false}
                        subtitle={seriesStatusLabel(detail!.status)}
                      />
                    ))}
                  </CardGrid>
                </div>
              )}

              {endedSeries.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Ended</h2>
                    <span className="text-xs font-medium text-text-muted">{endedSeries.length} items</span>
                  </div>
                  <CardGrid compact coverSize={settings.coverSize}>
                    {endedSeries.map(({ item, detail }) => (
                      <Card
                        key={item.id}
                        id={item.tmdbId}
                        title={item.title}
                        posterPath={item.posterPath}
                        releaseDate=""
                        voteAverage={0}
                        type="series"
                        showCountdown={false}
                        subtitle={detail!.status}
                        compact
                      />
                    ))}
                  </CardGrid>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
