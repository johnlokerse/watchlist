import type { InsightsData } from '../db/models';

export type Granularity = 'day' | 'week' | 'month';
export type InsightRange = '30d' | '90d' | '1y' | 'all';

export interface BucketMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  isRewatch: boolean;
}

export interface BucketSeries {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  /** Episodes ticked in this period, sorted by season then episode. */
  episodes: { season: number; episode: number }[];
}

export interface Bucket {
  key: string;
  start: Date;
  movies: BucketMovie[];
  series: BucketSeries[];
  /** Total episodes across all series; this is what the chart plots. */
  episodes: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-time start of the bucket that contains `date`. Weeks start on Monday. */
export function bucketStart(date: Date, granularity: Granularity): Date {
  if (granularity === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (granularity === 'week') day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

function nextBucket(date: Date, granularity: Granularity): Date {
  if (granularity === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + (granularity === 'week' ? 7 : 1));
}

function keyOf(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function rangeStart(range: InsightRange, now: Date, earliest: Date | null): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case '30d': return new Date(today.getTime() - 29 * DAY_MS);
    case '90d': return new Date(today.getTime() - 89 * DAY_MS);
    case '1y': return new Date(today.getFullYear(), today.getMonth() - 11, 1);
    case 'all': return earliest && earliest < today ? earliest : today;
  }
}

/**
 * Group dated watch events into a continuous run of buckets, so periods with
 * no activity still show up as zero instead of being skipped by the line.
 * Series activity comes only from dated episodes; series watch-log entries
 * (completions without episode dates) are ignored.
 */
export function buildBuckets(
  data: InsightsData,
  granularity: Granularity,
  range: InsightRange,
  now = new Date(),
): Bucket[] {
  const movieLog = data.log.filter((e) => e.contentType === 'movie');
  const timestamps = [...movieLog, ...data.episodes].map((e) => new Date(e.watchedAt));
  const earliest = timestamps.length ? new Date(Math.min(...timestamps.map((t) => t.getTime()))) : null;
  const from = bucketStart(rangeStart(range, now, earliest), granularity);
  const until = bucketStart(now, granularity);

  const buckets: Bucket[] = [];
  const byKey = new Map<string, Bucket>();
  for (let cursor = from; cursor <= until; cursor = nextBucket(cursor, granularity)) {
    const bucket: Bucket = { key: keyOf(cursor), start: cursor, movies: [], series: [], episodes: 0 };
    buckets.push(bucket);
    byKey.set(bucket.key, bucket);
  }

  const find = (iso: string) => byKey.get(keyOf(bucketStart(new Date(iso), granularity)));

  for (const e of movieLog) {
    find(e.watchedAt)?.movies.push({ tmdbId: e.tmdbId, title: e.title, posterPath: e.posterPath, isRewatch: e.isRewatch });
  }

  for (const e of data.episodes) {
    const bucket = find(e.watchedAt);
    if (!bucket) continue;
    let entry = bucket.series.find((s) => s.tmdbId === e.tmdbId);
    if (!entry) {
      entry = { tmdbId: e.tmdbId, title: e.title, posterPath: e.posterPath, episodes: [] };
      bucket.series.push(entry);
    }
    entry.episodes.push({ season: e.season, episode: e.episode });
    bucket.episodes++;
  }

  for (const bucket of buckets) {
    for (const s of bucket.series) s.episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
  }

  return buckets;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Short axis label. */
export function formatBucketTick(start: Date, granularity: Granularity): string {
  if (granularity === 'month') {
    return start.getMonth() === 0 ? String(start.getFullYear()) : MONTHS[start.getMonth()];
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()}`;
}

/** Full label for tooltips and headings. */
export function formatBucketLabel(start: Date, granularity: Granularity): string {
  if (granularity === 'month') return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  const base = `${MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
  return granularity === 'week' ? `Week of ${base}` : base;
}

export function formatEpisodeCount(count: number): string {
  return `${count} episode${count === 1 ? '' : 's'}`;
}

/**
 * Compact list of episode codes with consecutive runs collapsed,
 * e.g. "S1 E1–4, E6 · S2 E1".
 */
export function formatEpisodeList(episodes: { season: number; episode: number }[]): string {
  const bySeason = new Map<number, number[]>();
  for (const { season, episode } of episodes) {
    const list = bySeason.get(season) ?? [];
    list.push(episode);
    bySeason.set(season, list);
  }
  return [...bySeason.entries()]
    .map(([season, eps]) => {
      const runs: string[] = [];
      for (let i = 0; i < eps.length; i++) {
        let j = i;
        while (j + 1 < eps.length && eps[j + 1] === eps[j] + 1) j++;
        runs.push(i === j ? `E${eps[i]}` : `E${eps[i]}–${eps[j]}`);
        i = j;
      }
      return `S${season} ${runs.join(', ')}`;
    })
    .join(' · ');
}
