import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSeriesDetail } from '../api/tmdb';
import { useWatchLinks } from '../api/watchLinks';
import { useWatchedItem, useSeriesProgress, addToLibrary, updateWatchedItem, removeFromLibrary, updateSeriesProgress } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { useTabDirection } from '../hooks/useTabDirection';
import type { WatchedStatus } from '../db/models';
import HeroBanner from '../components/detail/HeroBanner';
import OverviewTab from '../components/detail/OverviewTab';
import CastCrewTab from '../components/detail/CastCrewTab';
import WatchProvidersTab from '../components/detail/WatchProvidersTab';
import EpisodesTab from '../components/detail/EpisodesTab';
import TrailerTab from '../components/detail/TrailerTab';
import WatchHistory from '../components/detail/WatchHistory';
import { LibraryActions, LibraryPanel } from '../components/detail/LibraryControls';
import { DetailNotFound, DetailSkeleton } from '../components/detail/DetailStates';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import Stepper from '../components/ui/Stepper';
import { buildSeriesReleaseTimeline } from '../utils/releaseTimeline';
import { formatDate } from '../utils/date';
import { getInitialEpisodeSeason } from '../utils/seriesProgress';

type Tab = 'overview' | 'episodes' | 'cast' | 'providers' | 'trailer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'cast', label: 'Cast & Crew' },
  { id: 'providers', label: 'Where to Watch' },
  { id: 'trailer', label: 'Trailer' },
];

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const seriesId = id ? Number(id) : undefined;
  const { data: series, isLoading, error } = useSeriesDetail(seriesId);
  const watchedItem = useWatchedItem(seriesId ?? 0, 'series');
  const progress = useSeriesProgress(seriesId ?? 0);
  const { settings } = useSettings();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const direction = useTabDirection(TABS, activeTab);
  const [editedNotesByItem, setEditedNotesByItem] = useState<Record<number, string>>({});
  const [pendingRemovalId, setPendingRemovalId] = useState<number | null>(null);
  const tabInitRef = useRef<number | null>(null);
  const watchLinks = useWatchLinks({
    contentType: 'series',
    tmdbId: seriesId ?? 0,
    country: settings.country,
    enabled: activeTab === 'providers' && !!seriesId && settings.streamingAvailabilityApiKey.trim().length > 0,
  });

  // Reset tab when navigating to a different series
  useEffect(() => {
    setActiveTab('overview');
    tabInitRef.current = null;
  }, [seriesId]);

  // Auto-switch to Episodes for active progress and newly available seasons.
  useEffect(() => {
    if (!seriesId || tabInitRef.current === seriesId) return;
    if (watchedItem === undefined) return;
    if (watchedItem.status === 'watched' && progress === undefined) return;
    tabInitRef.current = seriesId;
    if (watchedItem.status === 'watching' || progress?.newSeasonNumber) {
      setActiveTab('episodes');
    }
  }, [watchedItem, progress, seriesId]);

  const initialEpisodeSeason = useMemo(
    () => getInitialEpisodeSeason(watchedItem?.status, progress, series?.seasons),
    [watchedItem?.status, progress, series?.seasons],
  );

  const timelineEvents = useMemo(
    () => (series ? buildSeriesReleaseTimeline(series) : []),
    [series],
  );

  if (isLoading) return <DetailSkeleton />;
  if (error || !series) return <DetailNotFound kind="Series" />;

  const libraryItem = watchedItem && watchedItem.id !== pendingRemovalId ? watchedItem : undefined;
  const providers = series['watch/providers']?.results?.[settings.country];
  const imdbId = series.external_ids?.imdb_id;
  const notes = libraryItem?.id ? (editedNotesByItem[libraryItem.id] ?? libraryItem.notes ?? '') : '';

  const handleAddToLibrary = async (status: WatchedStatus) => {
    const itemId = await addToLibrary({
      tmdbId: series.id,
      contentType: 'series',
      title: series.name,
      posterPath: series.poster_path,
      releaseDate: series.first_air_date ?? null,
      status,
      userRating: null,
      notes: '',
      genreIds: series.genres.map((g) => g.id),
      watchedAt: null,
    });
    if (itemId) {
      await updateSeriesProgress({
        watchedItemId: itemId as number,
        tmdbId: series.id,
        currentSeason: 1,
        currentEpisode: 0,
        totalSeasons: series.number_of_seasons,
        totalEpisodes: series.number_of_episodes,
      });
    }
    toast.show({ message: 'Added to your library', tone: 'success', duration: 2500 });
  };

  const handleRemove = () => {
    const itemId = libraryItem?.id;
    if (!itemId) return;
    setPendingRemovalId(itemId);
    toast.show({
      message: `Removed “${series.name}”`,
      action: { label: 'Undo', onClick: () => setPendingRemovalId(null) },
      onExpire: () => { void removeFromLibrary(itemId); },
    });
  };

  const handleProgressChange = async (season: number, episode: number) => {
    if (libraryItem?.id) {
      await updateSeriesProgress({
        watchedItemId: libraryItem.id,
        tmdbId: series.id,
        currentSeason: season,
        currentEpisode: episode,
        totalSeasons: series.number_of_seasons,
        totalEpisodes: series.number_of_episodes,
      });
    }
  };

  const currentSeason = progress?.currentSeason ?? 1;
  const currentEpisode = progress?.currentEpisode ?? 0;

  const facts = [
    series.first_air_date?.slice(0, 4),
    series.genres.slice(0, 2).map((g) => g.name).join(', '),
    `${series.number_of_seasons} Seasons`,
    `${series.number_of_episodes} episodes`,
    `★ ${series.vote_average.toFixed(1)}`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <HeroBanner
        title={series.name}
        posterPath={series.poster_path}
        backdropPath={series.backdrop_path}
        tagline={series.tagline}
        meta={facts}
      >
        <LibraryActions
          item={libraryItem}
          addOrder={['watching', 'watched', 'plan_to_watch']}
          onAdd={handleAddToLibrary}
          onStatusChange={async (status) => {
            if (libraryItem?.id) await updateWatchedItem(libraryItem.id, { status });
          }}
          onRemove={handleRemove}
        />
      </HeroBanner>

      {libraryItem?.id && (
        <LibraryPanel
          item={libraryItem}
          notes={notes}
          onNotesChange={(value) => setEditedNotesByItem((prev) => ({ ...prev, [libraryItem.id!]: value }))}
          onSaveNotes={async () => { await updateWatchedItem(libraryItem.id!, { notes }); }}
          onRate={async (rating) => { await updateWatchedItem(libraryItem.id!, { userRating: rating }); }}
          leading={
            <>
              {progress?.newSeasonNumber && progress.newSeasonState && (
                <div className="grouped-row items-start gap-3 bg-warning/10 py-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-warning text-on-warning" aria-hidden="true">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" /></svg>
                  </span>
                  <p className="t-callout text-text-primary">
                    {progress.newSeasonState === 'airing' ? (
                      <>
                        <strong>Season {progress.newSeasonNumber} is airing.</strong>{' '}
                        This series moved back to Watching so you can pick it up again.
                      </>
                    ) : (
                      <>
                        <strong>Season {progress.newSeasonNumber} has been announced</strong>
                        {progress.newSeasonAirDate ? ` for ${formatDate(progress.newSeasonAirDate)}` : ''}. It stays
                        marked as watched until the first episode airs.
                      </>
                    )}
                  </p>
                </div>
              )}
              <div className="grouped-row flex-wrap justify-between gap-y-2 py-3">
                <div>
                  <p className="t-body text-text-primary">Progress:</p>
                  <p className="t-caption num">
                    {currentEpisode > 0 ? `Up next · S${currentSeason} E${currentEpisode}` : 'Not started'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Stepper
                    label="Season"
                    value={currentSeason}
                    min={1}
                    max={series.number_of_seasons}
                    suffix={`of ${series.number_of_seasons}`}
                    onChange={(season) => handleProgressChange(season, currentEpisode)}
                  />
                  <Stepper
                    label="Episode"
                    value={currentEpisode}
                    min={0}
                    onChange={(episode) => handleProgressChange(currentSeason, episode)}
                  />
                </div>
              </div>
            </>
          }
          history={libraryItem.status === 'watched' ? (
            <WatchHistory
              itemId={libraryItem.id}
              tmdbId={series.id}
              contentType="series"
              watchedAt={libraryItem.watchedAt}
            />
          ) : undefined}
        />
      )}

      <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} ariaLabel="Series sections" idPrefix="series" />

      <TabPanel id={activeTab} prefix="series" direction={direction}>
        {activeTab === 'overview' && (
          <OverviewTab
            overview={series.overview}
            genres={series.genres}
            releaseDate={series.first_air_date}
            status={series.status}
            imdbId={imdbId}
            tmdbId={series.id}
            type="series"
            timelineEvents={timelineEvents}
          />
        )}
        {activeTab === 'episodes' && (
          <EpisodesTab
            tmdbId={series.id}
            totalSeasons={series.number_of_seasons}
            initialSeason={initialEpisodeSeason}
            seriesTitle={series.name}
            imdbId={imdbId ?? undefined}
            onEpisodeWatched={handleProgressChange}
          />
        )}
        {activeTab === 'cast' && series.credits && (
          <CastCrewTab cast={series.credits.cast} crew={series.credits.crew} />
        )}
        {activeTab === 'providers' && (
          <WatchProvidersTab
            providers={providers}
            country={settings.country}
            userServiceIds={settings.streamingServices}
            deepLinksConfigured={settings.streamingAvailabilityApiKey.trim().length > 0}
            deepLinks={watchLinks.data?.links}
            deepLinksLoading={watchLinks.isLoading}
            deepLinksError={watchLinks.error instanceof Error ? watchLinks.error.message : null}
          />
        )}
        {activeTab === 'trailer' && (
          <TrailerTab videos={series.videos?.results} />
        )}
      </TabPanel>
    </div>
  );
}
