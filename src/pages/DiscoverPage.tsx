import { useTrendingMovies, useTrendingSeries, useAnticipatedMovies, useAnticipatedSeries } from '../api/tmdb';
import Card from '../components/ui/Card';
import ScrollRow from '../components/ui/ScrollRow';
import SkeletonCard from '../components/ui/SkeletonCard';

export default function DiscoverPage() {
  const movies = useTrendingMovies();
  const series = useTrendingSeries();
  const anticipatedMovies = useAnticipatedMovies();
  const anticipatedSeries = useAnticipatedSeries();

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Trending</p>
          <h2 className="text-2xl font-bold">Shows</h2>
        </div>
        {series.isLoading ? (
          <ScrollRow>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow>
            {series.data?.results.slice(0, 12).map((s) => (
              <Card
                key={s.id}
                id={s.id}
                title={s.name}
                posterPath={s.poster_path}
                releaseDate={s.first_air_date}
                voteAverage={s.vote_average}
                type="series"
              />
            ))}
          </ScrollRow>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Trending</p>
          <h2 className="text-2xl font-bold">Movies</h2>
        </div>
        {movies.isLoading ? (
          <ScrollRow>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow>
            {movies.data?.results.slice(0, 12).map((m) => (
              <Card
                key={m.id}
                id={m.id}
                title={m.title}
                posterPath={m.poster_path}
                releaseDate={m.release_date}
                voteAverage={m.vote_average}
                type="movie"
              />
            ))}
          </ScrollRow>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Anticipated</p>
          <h2 className="text-2xl font-bold">Shows</h2>
        </div>
        {anticipatedSeries.isLoading ? (
          <ScrollRow>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow>
            {anticipatedSeries.data?.results.slice(0, 12).map((s) => (
              <Card
                key={s.id}
                id={s.id}
                title={s.name}
                posterPath={s.poster_path}
                releaseDate={s.first_air_date}
                voteAverage={s.vote_average}
                type="series"
              />
            ))}
          </ScrollRow>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Anticipated</p>
          <h2 className="text-2xl font-bold">Movies</h2>
        </div>
        {anticipatedMovies.isLoading ? (
          <ScrollRow>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow>
            {anticipatedMovies.data?.results.slice(0, 12).map((m) => (
              <Card
                key={m.id}
                id={m.id}
                title={m.title}
                posterPath={m.poster_path}
                releaseDate={m.release_date}
                voteAverage={m.vote_average}
                type="movie"
              />
            ))}
          </ScrollRow>
        )}
      </section>
    </div>
  );
}
