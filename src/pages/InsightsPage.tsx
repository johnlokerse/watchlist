import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInsights } from '../db/hooks';
import SegmentedControl from '../components/ui/SegmentedControl';
import ActivityChart, { LegendSwatch, SERIES_LINES } from '../components/insights/ActivityChart';
import { buildBuckets, formatBucketLabel, formatEpisodeCount, formatEpisodeList } from '../utils/insights';
import type { Bucket, Granularity, InsightRange } from '../utils/insights';
import { posterUrl } from '../utils/image';

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const RANGES: { value: InsightRange; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '12 months' },
  { value: 'all', label: 'All time' },
];

const DEFAULT_GRANULARITY: Granularity = 'month';
const DEFAULT_RANGE: InsightRange = '1y';

function hasActivity(b: Bucket) {
  return b.movies.length > 0 || b.series.length > 0;
}

export default function InsightsPage() {
  const { data, error } = useInsights();
  const [searchParams, setSearchParams] = useSearchParams();
  const granularity = (GRANULARITIES.find((g) => g.value === searchParams.get('by'))?.value ?? DEFAULT_GRANULARITY);
  const range = (RANGES.find((r) => r.value === searchParams.get('range'))?.value ?? DEFAULT_RANGE);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const setParam = (name: 'by' | 'range', value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(name, value);
    setSearchParams(next, { replace: true });
    setSelectedKey(null);
  };

  const buckets = useMemo(() => (data ? buildBuckets(data, granularity, range) : []), [data, granularity, range]);

  const totals = useMemo(() => {
    const seriesIds = new Set<number>();
    let movies = 0;
    let rewatches = 0;
    let episodes = 0;
    let busiest: Bucket | null = null;
    for (const b of buckets) {
      movies += b.movies.length;
      rewatches += b.movies.filter((m) => m.isRewatch).length;
      episodes += b.episodes;
      for (const s of b.series) seriesIds.add(s.tmdbId);
      const size = b.movies.length + b.episodes;
      if (size > 0 && (!busiest || size > busiest.movies.length + busiest.episodes)) busiest = b;
    }
    return { movies, series: seriesIds.size, episodes, rewatches, busiest };
  }, [buckets]);

  // Default to the most recent period with activity so the detail list is useful immediately.
  const selectedIndex = useMemo(() => {
    if (!buckets.length) return null;
    if (selectedKey) {
      const found = buckets.findIndex((b) => b.key === selectedKey);
      if (found >= 0) return found;
    }
    for (let i = buckets.length - 1; i >= 0; i--) if (hasActivity(buckets[i])) return i;
    return buckets.length - 1;
  }, [buckets, selectedKey]);

  const selectedBucket = selectedIndex != null ? buckets[selectedIndex] : null;
  const undatedTotal = data ? data.undated.movie + data.undated.series : 0;
  const isEmpty = data && data.log.length === 0 && data.episodes.length === 0;

  return (
    <div className="space-y-6">
      <div className="relative z-40 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="pr-12 md:pr-0">
          <h1 className="page-title">Insights</h1>
          <p className="t-callout mt-1 text-text-secondary">What you watched, and when</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            options={GRANULARITIES}
            value={granularity}
            onChange={(v) => setParam('by', v)}
            ariaLabel="Group by"
          />
          <SegmentedControl
            options={RANGES}
            value={range}
            onChange={(v) => setParam('range', v)}
            ariaLabel="Time range"
          />
        </div>
      </div>

      {error && !data ? (
        <div className="py-16 text-center" role="alert">
          <p className="t-headline">Couldn't load insights</p>
          <p className="t-callout mt-1 text-text-secondary">
            The server isn't responding. Check that the backend is running, then reload this page.
          </p>
        </div>
      ) : !data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading insights">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[88px] rounded-[16px]" />)}
          </div>
          <div className="skeleton h-[320px] rounded-[16px]" />
        </div>
      ) : isEmpty ? (
        <div className="py-16 text-center">
          <p className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent" aria-hidden="true">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 4v16.5H20" />
              <path d="m7 15 3.5-4.5 3 2.5 5-6.5" />
            </svg>
          </p>
          <p className="t-headline">No watch history yet</p>
          <p className="t-callout mt-1 text-text-secondary">
            Mark a movie as watched or tick off an episode and it will show up here.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/movies" className="press inline-flex min-h-9 items-center rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-on-accent">Browse Movies</Link>
            <Link to="/series" className="press inline-flex min-h-9 items-center rounded-full bg-fill px-4 text-[0.875rem] font-semibold text-text-primary">Browse Series</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Movies watched" value={totals.movies} testId="stat-movies" />
            <StatTile label="Series watched" value={totals.series} testId="stat-series" />
            <StatTile label="Episodes" value={totals.episodes} testId="stat-episodes" />
            <StatTile
              label="Busiest period"
              value={totals.busiest ? formatBucketLabel(totals.busiest.start, granularity).replace('Week of ', '') : '—'}
              testId="stat-busiest"
              small
            />
          </div>

          <div className="app-panel p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="t-headline">Watch activity</h2>
              <div className="t-caption flex items-center gap-4" role="group" aria-label="Legend">
                {SERIES_LINES.map((line) => (
                  <span key={line.key} className="flex items-center gap-1.5">
                    <LegendSwatch color={line.color} shape={line.key === 'movies' ? 'circle' : 'square'} />
                    {line.label}
                  </span>
                ))}
              </div>
            </div>
            <ActivityChart
              buckets={buckets}
              granularity={granularity}
              selectedIndex={selectedIndex}
              onSelect={(index) => setSelectedKey(buckets[index].key)}
            />
            {(totals.rewatches > 0 || undatedTotal > 0) && (
              <p className="t-caption mt-3 text-text-muted" data-testid="insights-footnote">
                {totals.rewatches > 0 && `Includes ${totals.rewatches} rewatch${totals.rewatches === 1 ? '' : 'es'}. `}
                {undatedTotal > 0 &&
                  `${undatedTotal} watched title${undatedTotal === 1 ? ' has' : 's have'} no watch date and ${undatedTotal === 1 ? 'is' : 'are'} not shown.`}
              </p>
            )}
          </div>

          {selectedBucket && (
            <section className="space-y-3" aria-label="Selected period" data-testid="period-details">
              <h2 className="section-title px-1" aria-live="polite">{formatBucketLabel(selectedBucket.start, granularity)}</h2>
              {hasActivity(selectedBucket) ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {selectedBucket.movies.map((m, i) => (
                    <PeriodRow
                      key={`m-${m.tmdbId}-${i}`}
                      to={`/movie/${m.tmdbId}`}
                      title={m.title}
                      posterPath={m.posterPath}
                      meta={m.isRewatch ? 'Movie · Rewatch' : 'Movie'}
                    />
                  ))}
                  {selectedBucket.series.map((s) => (
                    <PeriodRow
                      key={`s-${s.tmdbId}`}
                      to={`/series/${s.tmdbId}`}
                      title={s.title}
                      posterPath={s.posterPath}
                      meta={`Series · ${formatEpisodeCount(s.episodes.length)}`}
                      detail={formatEpisodeList(s.episodes)}
                    />
                  ))}
                </div>
              ) : (
                <p className="t-callout px-1 text-text-secondary">Nothing watched in this period.</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, testId, small }: { label: string; value: number | string; testId: string; small?: boolean }) {
  return (
    <div className="app-panel min-w-0 p-4" data-testid={testId}>
      <p className="t-caption">{label}</p>
      <p
        className={`num mt-1 truncate font-bold leading-none tracking-[-0.02em] text-text-primary ${small ? 'pt-1.5 text-[1.125rem]' : 'text-[1.875rem]'}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function PeriodRow({
  to,
  title,
  posterPath,
  meta,
  detail,
}: {
  to: string;
  title: string;
  posterPath: string | null;
  meta: string;
  detail?: string;
}) {
  const url = posterUrl(posterPath, 'w92');
  return (
    <Link to={to} className="database-row group flex min-h-16 items-center gap-3 px-3 py-2">
      <div className="aspect-[2/3] w-9 flex-shrink-0 overflow-hidden rounded-md bg-surface-overlay">
        {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-text-primary">
          {title}
        </span>
        <span className="t-caption block">{meta}</span>
        {detail && (
          <span className="t-caption num mt-0.5 block text-text-muted">
            {detail}
          </span>
        )}
      </div>
    </Link>
  );
}
