import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMovieDetail } from '../api/tmdb';
import { useWatchedItem, addToLibrary, updateWatchedItem, removeFromLibrary } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import type { WatchedStatus } from '../db/models';
import HeroBanner from '../components/detail/HeroBanner';
import OverviewTab from '../components/detail/OverviewTab';
import CastCrewTab from '../components/detail/CastCrewTab';
import WatchProvidersTab from '../components/detail/WatchProvidersTab';
import TrailerTab from '../components/detail/TrailerTab';
import RatingStars from '../components/ui/RatingStars';

type Tab = 'overview' | 'cast' | 'providers' | 'trailer';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const movieId = id ? Number(id) : undefined;
  const { data: movie, isLoading, error } = useMovieDetail(movieId);
  const watchedItem = useWatchedItem(movieId ?? 0, 'movie');
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editedNotesByItem, setEditedNotesByItem] = useState<Record<number, string>>({});
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const notes = watchedItem?.id ? (editedNotesByItem[watchedItem.id] ?? watchedItem.notes) : '';

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
    });
    setShowAddDropdown(false);
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
    { id: 'trailer' as Tab, label: 'Trailer' },
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
              </select>
              <button
                onClick={handleRemove}
                className="px-3 py-1.5 bg-danger/15 text-danger rounded-lg text-sm hover:bg-danger/25 transition"
              >
                Remove
              </button>
            </>
          ) : (
            <div className="relative" ref={addDropdownRef}>
              <button
                onClick={() => setShowAddDropdown((v) => !v)}
                className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition flex items-center gap-1"
              >
                + Add to Library
              </button>
              {showAddDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-surface-raised border border-border-subtle rounded-lg shadow-lg z-10 min-w-max">
                  <button onClick={() => handleAddToLibrary('watched')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface transition rounded-t-lg">Watched</button>
                  <button onClick={() => handleAddToLibrary('watching')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface transition">Watching</button>
                  <button onClick={() => handleAddToLibrary('plan_to_watch')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface transition rounded-b-lg">Plan to Watch</button>
                </div>
              )}
            </div>
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
                value={notes}
                onChange={(e) => {
                  const itemId = watchedItem?.id;
                  if (!itemId) return;
                  const value = e.target.value;
                  setEditedNotesByItem((prev) => ({ ...prev, [itemId]: value }));
                }}
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
      <div className="flex gap-1 border-b border-border-subtle mb-4 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
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
      {activeTab === 'trailer' && (
        <TrailerTab videos={movie.videos?.results} />
      )}
    </div>
  );
}
