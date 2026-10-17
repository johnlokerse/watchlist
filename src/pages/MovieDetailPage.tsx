import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMovieDetail } from '../api/tmdb';
import { useWatchLinks } from '../api/watchLinks';
import { useWatchedItem, addToLibrary, updateWatchedItem, removeFromLibrary } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { useTabDirection } from '../hooks/useTabDirection';
import type { WatchedStatus } from '../db/models';
import HeroBanner from '../components/detail/HeroBanner';
import OverviewTab from '../components/detail/OverviewTab';
import CastCrewTab from '../components/detail/CastCrewTab';
import WatchProvidersTab from '../components/detail/WatchProvidersTab';
import TrailerTab from '../components/detail/TrailerTab';
import WatchHistory from '../components/detail/WatchHistory';
import { LibraryActions, LibraryPanel } from '../components/detail/LibraryControls';
import { DetailNotFound, DetailSkeleton } from '../components/detail/DetailStates';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { buildMovieReleaseTimeline } from '../utils/releaseTimeline';

type Tab = 'overview' | 'cast' | 'providers' | 'trailer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'cast', label: 'Cast & Crew' },
  { id: 'providers', label: 'Where to Watch' },
  { id: 'trailer', label: 'Trailer' },
];

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const movieId = id ? Number(id) : undefined;
  const { data: movie, isLoading, error } = useMovieDetail(movieId);
  const watchedItem = useWatchedItem(movieId ?? 0, 'movie');
  const { settings } = useSettings();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const direction = useTabDirection(TABS, activeTab);
  const [editedNotesByItem, setEditedNotesByItem] = useState<Record<number, string>>({});
  // Removal is optimistic and deferred so it can be undone from the toast.
  const [pendingRemovalId, setPendingRemovalId] = useState<number | null>(null);
  const watchLinks = useWatchLinks({
    contentType: 'movie',
    tmdbId: movieId ?? 0,
    country: settings.country,
    enabled: activeTab === 'providers' && !!movieId && settings.streamingAvailabilityApiKey.trim().length > 0,
  });

  const timelineEvents = useMemo(
    () => (movie ? buildMovieReleaseTimeline(movie, settings.country) : []),
    [movie, settings.country],
  );

  if (isLoading) return <DetailSkeleton />;
  if (error || !movie) return <DetailNotFound kind="Movie" />;

  const libraryItem = watchedItem && watchedItem.id !== pendingRemovalId ? watchedItem : undefined;
  const providers = movie['watch/providers']?.results?.[settings.country];
  const notes = libraryItem?.id ? (editedNotesByItem[libraryItem.id] ?? libraryItem.notes ?? '') : '';

  const handleAddToLibrary = async (status: WatchedStatus) => {
    await addToLibrary({
      tmdbId: movie.id,
      contentType: 'movie',
      title: movie.title,
      posterPath: movie.poster_path,
      releaseDate: movie.release_date ?? null,
      status,
      userRating: null,
      notes: '',
      genreIds: movie.genres.map((g) => g.id),
      watchedAt: null,
    });
    toast.show({ message: `Added to your library`, tone: 'success', duration: 2500 });
  };

  const handleRemove = () => {
    const itemId = libraryItem?.id;
    if (!itemId) return;
    setPendingRemovalId(itemId);
    toast.show({
      message: `Removed “${movie.title}”`,
      action: { label: 'Undo', onClick: () => setPendingRemovalId(null) },
      onExpire: () => { void removeFromLibrary(itemId); },
    });
  };

  const facts = [
    movie.release_date?.slice(0, 4),
    movie.genres.slice(0, 2).map((g) => g.name).join(', '),
    movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null,
    `★ ${movie.vote_average.toFixed(1)}`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <HeroBanner
        title={movie.title}
        posterPath={movie.poster_path}
        backdropPath={movie.backdrop_path}
        tagline={movie.tagline}
        meta={facts}
      >
        <LibraryActions
          item={libraryItem}
          addOrder={['watched', 'watching', 'plan_to_watch']}
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
          history={libraryItem.status === 'watched' ? (
            <WatchHistory
              itemId={libraryItem.id}
              tmdbId={movie.id}
              contentType="movie"
              watchedAt={libraryItem.watchedAt}
            />
          ) : undefined}
        />
      )}

      <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} ariaLabel="Movie sections" idPrefix="movie" />

      <TabPanel id={activeTab} prefix="movie" direction={direction}>
        {activeTab === 'overview' && (
          <OverviewTab
            overview={movie.overview}
            genres={movie.genres}
            releaseDate={movie.release_date}
            runtime={movie.runtime}
            status={movie.status}
            imdbId={movie.imdb_id}
            tmdbId={movie.id}
            type="movie"
            timelineEvents={timelineEvents}
          />
        )}
        {activeTab === 'cast' && movie.credits && (
          <CastCrewTab cast={movie.credits.cast} crew={movie.credits.crew} />
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
          <TrailerTab videos={movie.videos?.results} />
        )}
      </TabPanel>
    </div>
  );
}
