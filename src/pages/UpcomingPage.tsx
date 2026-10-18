import { useMemo } from 'react';
import { useUpcomingFromLibrary, usePlannedMovies } from '../db/hooks';
import type { ContentType } from '../db/models';
import { useSeriesDetailBatch } from '../api/tmdb';
import { useNewSeasonCheck } from '../hooks/useNewSeasonCheck';
import { useSettings } from '../hooks/useSettings';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import SkeletonCard from '../components/ui/SkeletonCard';
import { useToday } from '../hooks/useToday';

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

interface UpcomingPageProps {
  contentType: ContentType;
}

export default function UpcomingPage({ contentType }: UpcomingPageProps) {
  const { settings } = useSettings();
  const tab = contentType === 'movie' ? 'movies' : 'series';
  const upcomingItems = useUpcomingFromLibrary(contentType);
  useNewSeasonCheck(contentType === 'series');
  const movies = contentType === 'movie' ? upcomingItems : undefined;
  const series = contentType === 'series' ? upcomingItems : undefined;
  const plannedMovies = usePlannedMovies();

  const today = useToday();

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
    <div className="space-y-9">
      {/* ── Movies tab ── */}
      {tab === 'movies' && (
        <>
          {moviesItems === undefined ? (
            <div aria-busy="true">
              <div className="skeleton mb-4 h-3.5 w-32 rounded" />
              <CardGrid coverSize={settings.coverSize}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </CardGrid>
            </div>
          ) : moviesItems.length === 0 ? (
            <div className="py-16 text-center text-text-secondary">
              <p className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
                  <path d="M8 2.8v4M16 2.8v4M3.5 9h17" />
                </svg>
              </p>
              <p className="t-headline mb-1 text-text-primary">Nothing upcoming yet</p>
              <p className="t-callout">
                Add unreleased movies to your library and they'll appear here.
              </p>
            </div>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Release dates</h2>
                <span className="t-caption num text-text-muted">{moviesItems.length} upcoming</span>
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
                <span className="t-caption num text-text-muted">{plannedMovies.length} {plannedMovies.length === 1 ? 'item' : 'items'}</span>
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
              <div aria-busy="true">
                <div className="skeleton mb-4 h-3.5 w-32 rounded" />
                <CardGrid coverSize={settings.coverSize}>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </CardGrid>
              </div>
            ) : (
              <CardGrid coverSize={settings.coverSize}>
                {series.map((item) => (
                  <SkeletonCard key={item.id} />
                ))}
              </CardGrid>
            )
          ) : series.length === 0 ? (
            <div className="py-16 text-center text-text-secondary">
              <p className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
                  <path d="M8 2.8v4M16 2.8v4M3.5 9h17" />
                </svg>
              </p>
              <p className="t-headline mb-1 text-text-primary">Nothing upcoming yet</p>
              <p className="t-callout">
                Series on your watchlist with upcoming episodes will appear here.
              </p>
            </div>
          ) : upcomingEpisodes.length === 0 && announcedSeries.length === 0 && endedSeries.length === 0 ? (
            <div className="py-16 text-center text-text-secondary">
              <p className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </p>
              <p className="t-headline mb-1 text-text-primary">All caught up</p>
              <p className="t-callout">
                None of your series have upcoming episodes right now.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {upcomingEpisodes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Next episodes</h2>
                    <span className="t-caption num text-text-muted">{upcomingEpisodes.length} {upcomingEpisodes.length === 1 ? 'item' : 'items'}</span>
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
                    <span className="t-caption num text-text-muted">{announcedSeries.length} {announcedSeries.length === 1 ? 'item' : 'items'}</span>
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
                  <div className="hairline-top flex items-center justify-between pt-6">
                    <h2 className="section-title">Ended</h2>
                    <span className="t-caption num text-text-muted">{endedSeries.length} {endedSeries.length === 1 ? 'item' : 'items'}</span>
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
