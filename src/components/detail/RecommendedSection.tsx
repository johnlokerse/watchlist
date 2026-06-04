import { useMovieRecommendations, useSeriesRecommendations } from '../../api/tmdb';
import { useSettings } from '../../hooks/useSettings';
import ScrollRow from '../ui/ScrollRow';
import Card from '../ui/Card';
import SkeletonCard from '../ui/SkeletonCard';
import type { CoverSize } from '../../hooks/useSettings';
import type { TMDBMovie, TMDBSeries } from '../../api/types';

interface Props {
  tmdbId: number;
  type: 'movie' | 'series';
}

interface FlatItem {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
}

const SMALLER: Record<CoverSize, CoverSize> = {
  xs: 'xs',
  small: 'xs',
  medium: 'small',
  large: 'medium',
};

export default function RecommendedSection({ tmdbId, type }: Props) {
  const { settings } = useSettings();
  const coverSize = SMALLER[settings.coverSize];
  const movieQuery = useMovieRecommendations(type === 'movie' ? tmdbId : undefined);
  const seriesQuery = useSeriesRecommendations(type === 'series' ? tmdbId : undefined);
  const query = type === 'movie' ? movieQuery : seriesQuery;
  const rawItems = query.data?.results ?? [];

  const items: FlatItem[] = type === 'movie'
    ? (rawItems as TMDBMovie[]).map((m) => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
      }))
    : (rawItems as TMDBSeries[]).map((s) => ({
        id: s.id,
        title: s.name,
        posterPath: s.poster_path,
        releaseDate: s.first_air_date,
        voteAverage: s.vote_average,
      }));

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <p className="section-title text-sm">You might also like..</p>
        <ScrollRow coverSize={coverSize}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </ScrollRow>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3 pt-4">
      <p className="section-title text-sm">You might also like..</p>
      <ScrollRow coverSize={coverSize}>
        {items.slice(0, 12).map((item) => (
          <Card
            key={item.id}
            id={item.id}
            title={item.title}
            posterPath={item.posterPath}
            releaseDate={item.releaseDate}
            voteAverage={item.voteAverage}
            type={type}
          />
        ))}
      </ScrollRow>
    </div>
  );
}
