import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeriesDetail } from '../api/tmdb';
import { useWatchedItem, useSeriesProgress, addToLibrary, updateWatchedItem, removeFromLibrary, updateSeriesProgress } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import HeroBanner from '../components/detail/HeroBanner';
import OverviewTab from '../components/detail/OverviewTab';
import CastCrewTab from '../components/detail/CastCrewTab';
import WatchProvidersTab from '../components/detail/WatchProvidersTab';
import EpisodesTab from '../components/detail/EpisodesTab';
import RatingStars from '../components/ui/RatingStars';

type Tab = 'overview' | 'episodes' | 'cast' | 'providers';

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const seriesId = id ? Number(id) : undefined;
  const { data: series, isLoading, error } = useSeriesDetail(seriesId);
  const watchedItem = useWatchedItem(seriesId ?? 0, 'series');
  const progress = useSeriesProgress(seriesId ?? 0);
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

  if (error || !series) {
    return (
      <div className="text-center py-20 text-text-muted">
        <p className="text-4xl mb-2">😕</p>
        <p>Series not found.</p>
        <button onClick={() => navigate(-1)} className="text-accent mt-2 text-sm hover:underline">Go back</button>
      </div>
    );
  }

  const providers = series['watch/providers']?.results?.[settings.country];
  const imdbId = series.external_ids?.imdb_id;

  const handleAddToLibrary = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const isFutureRelease = !!series.first_air_date && series.first_air_date > today;
    const itemId = await addToLibrary({
      tmdbId: series.id,
      contentType: 'series',
      title: series.name,
      posterPath: series.poster_path,
      releaseDate: series.first_air_date ?? null,
      status: isFutureRelease ? 'plan_to_watch' : 'watching',
      userRating: null,
      notes: '',
      genreIds: series.genres.map((g) => g.id),
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

  const handleProgressChange = async (season: number, episode: number) => {
    if (watchedItem?.id) {
      await updateSeriesProgress({
        watchedItemId: watchedItem.id,
        tmdbId: series.id,
        currentSeason: season,
        currentEpisode: episode,
        totalSeasons: series.number_of_seasons,
        totalEpisodes: series.number_of_episodes,
      });
    }
  };

  const facts = [
    series.genres.length > 0 && { label: 'Genre', value: series.genres.map((g) => g.name).join(', ') },
    { label: 'Seasons', value: String(series.number_of_seasons) },
    { label: 'Episodes', value: String(series.number_of_episodes) },
    { label: 'Rating', value: `★ ${series.vote_average.toFixed(1)}` },
  ].filter(Boolean) as { label: string; value: string }[];

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'episodes' as Tab, label: 'Episodes' },
    { id: 'cast' as Tab, label: 'Cast & Crew' },
    { id: 'providers' as Tab, label: 'Where to Watch' },
  ];

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary text-sm mb-2 inline-flex items-center gap-1">
        ← Back
      </button>

      <HeroBanner
        title={series.name}
        posterPath={series.poster_path}
        backdropPath={series.backdrop_path}
        tagline={series.tagline}
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
                <option value="watching">Watching</option>
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

      {/* Progress & Rating for library items */}
      {watchedItem && (
        <div className="mb-6 bg-surface-raised rounded-xl border border-border-subtle p-4 space-y-3">
          {/* Progress tracker */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-text-secondary">Progress:</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">Season</label>
              <input
                type="number"
                min={1}
                max={series.number_of_seasons}
                value={progress?.currentSeason ?? 1}
                onChange={(e) => handleProgressChange(Number(e.target.value), progress?.currentEpisode ?? 0)}
                className="w-16 bg-surface border border-border-subtle rounded px-2 py-1 text-sm text-text-primary text-center"
              />
              <span className="text-text-muted text-xs">/ {series.number_of_seasons}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">Episode</label>
              <input
                type="number"
                min={0}
                value={progress?.currentEpisode ?? 0}
                onChange={(e) => handleProgressChange(progress?.currentSeason ?? 1, Number(e.target.value))}
                className="w-16 bg-surface border border-border-subtle rounded px-2 py-1 text-sm text-text-primary text-center"
              />
            </div>
          </div>

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
          overview={series.overview}
          genres={series.genres}
          releaseDate={series.first_air_date}
          status={series.status}
          imdbId={imdbId}
          tmdbId={series.id}
          type="series"
        />
      )}
      {activeTab === 'episodes' && (
        <EpisodesTab
          tmdbId={series.id}
          totalSeasons={series.number_of_seasons}
          initialSeason={progress?.currentSeason ?? 1}
        />
      )}
      {activeTab === 'cast' && series.credits && (
        <CastCrewTab cast={series.credits.cast} crew={series.credits.crew} />
      )}
      {activeTab === 'providers' && (
        <WatchProvidersTab providers={providers} country={settings.country} />
      )}
    </div>
  );
}
