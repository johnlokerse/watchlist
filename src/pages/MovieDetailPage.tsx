import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMovieDetail } from '../api/tmdb';
import { useWatchedItem, addToLibrary, updateWatchedItem, removeFromLibrary } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import HeroBanner from '../components/detail/HeroBanner';
import OverviewTab from '../components/detail/OverviewTab';
import CastCrewTab from '../components/detail/CastCrewTab';
import WatchProvidersTab from '../components/detail/WatchProvidersTab';
import RatingStars from '../components/ui/RatingStars';

type Tab = 'overview' | 'cast' | 'providers';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const movieId = id ? Number(id) : undefined;
  const { data: movie, isLoading, error } = useMovieDetail(movieId);
  const watchedItem = useWatchedItem(movieId ?? 0, 'movie');
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [notes, setNotes] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="text-center py-20 text-text-muted">
        <p className="text-4xl mb-2">😕</p>
        <p>Movie not found.</p>
        <button onClick={() => navigate(-1)} className="text-accent mt-2 text-sm hover:underline">Go back</button>
      </div>
    );
  }

  const providers = movie['watch/providers']?.results?.[settings.country];

  const handleAddToLibrary = async () => {
    await addToLibrary({
      tmdbId: movie.id,
      contentType: 'movie',
      title: movie.title,
      posterPath: movie.poster_path,
      releaseDate: movie.release_date ?? null,
      status: 'watched',
      userRating: null,
      notes: '',
      genreIds: movie.genres.map((g) => g.id),
    });
  };

  const handleRate = async (rating: number) => {
    if (watchedItem?.id) {
      await updateWatchedItem(watchedItem.id, { userRating: rating });
    }
  };

  const handleRemove = async () => {
    if (watchedItem?.id) {
      await removeFromLibrary(watchedItem.id);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (watchedItem?.id) {
      await updateWatchedItem(watchedItem.id, { status: status as any });
    }
  };

  const handleSaveNotes = async () => {
    if (watchedItem?.id) {
      await updateWatchedItem(watchedItem.id, { notes });
    }
  };

  const facts = [
    movie.genres.length > 0 && { label: 'Genre', value: movie.genres.map((g) => g.name).join(', ') },
    movie.runtime && { label: 'Runtime', value: `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` },
    { label: 'Rating', value: `★ ${movie.vote_average.toFixed(1)}` },
  ].filter(Boolean) as { label: string; value: string }[];

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'cast' as Tab, label: 'Cast & Crew' },
    { id: 'providers' as Tab, label: 'Where to Watch' },
  ];

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary text-sm mb-2 inline-flex items-center gap-1">
        ← Back
      </button>

      <HeroBanner
        title={movie.title}
        posterPath={movie.poster_path}
        backdropPath={movie.backdrop_path}
        tagline={movie.tagline}
        facts={facts}
      >
        <div className="flex flex-wrap items-center gap-2">
          {watchedItem ? (
            <>
              <select
                value={watchedItem.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-surface-raised border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary"
              >
                <option value="watched">Watched</option>
                <option value="plan_to_watch">Plan to Watch</option>
                <option value="dropped">Dropped</option>
              </select>
              <button
                onClick={handleRemove}
                className="px-3 py-1.5 bg-danger/15 text-danger rounded-lg text-sm hover:bg-danger/25 transition"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              onClick={handleAddToLibrary}
              className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition"
            >
              + Add to Library
            </button>
          )}
        </div>
      </HeroBanner>

      {/* Rating & Notes for library items */}
      {watchedItem && (
        <div className="mb-6 bg-surface-raised rounded-xl border border-border-subtle p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">Your Rating:</span>
            <RatingStars value={watchedItem.userRating} onChange={handleRate} size="sm" />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Notes</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={notes || watchedItem.notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add personal notes..."
                className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1.5 bg-accent/15 text-accent rounded-lg text-sm hover:bg-accent/25 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
        />
      )}
      {activeTab === 'cast' && movie.credits && (
        <CastCrewTab cast={movie.credits.cast} crew={movie.credits.crew} />
      )}
      {activeTab === 'providers' && (
        <WatchProvidersTab providers={providers} country={settings.country} userServiceIds={settings.streamingServices} />
      )}
    </div>
  );
}
