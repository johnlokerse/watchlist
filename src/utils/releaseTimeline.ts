import type {
  TMDBMovieDetail,
  TMDBSeriesDetail,
  TMDBVideo,
  TMDBCountryReleaseDates,
} from '../api/types';

export type ReleaseTimelineEventKind =
  | 'teaser'
  | 'trailer'
  | 'release'
  | 'digital'
  | 'physical'
  | 'premiere'
  | 'season'
  | 'episode';

export interface ReleaseTimelineEvent {
  id: string;
  date: string;
  title: string;
  kind: ReleaseTimelineEventKind;
  source: 'tmdb';
  url?: string;
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const [date] = value.split('T');
  if (!date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function dedupeAndSort(events: Omit<ReleaseTimelineEvent, 'id' | 'source'>[]): ReleaseTimelineEvent[] {
  const seen = new Set<string>();
  const unique = events.filter((event) => {
    const key = `${event.date}-${event.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  return unique.map((event, index) => ({
    ...event,
    id: `${event.kind}-${event.date}-${index}`,
    source: 'tmdb',
  }));
}

function toYoutubeUrl(video: TMDBVideo): string | undefined {
  if (video.site !== 'YouTube' || !video.key) return undefined;
  return `https://www.youtube.com/watch?v=${video.key}`;
}

function buildVideoEvents(videos: TMDBVideo[] | undefined): Omit<ReleaseTimelineEvent, 'id' | 'source'>[] {
  const filtered = (videos ?? [])
    .filter((video) => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser'))
    .map((video) => ({ ...video, timelineDate: dateOnly(video.published_at) }))
    .filter((video): video is TMDBVideo & { timelineDate: string } => Boolean(video.timelineDate));

  const sorted = filtered.sort((a, b) => a.timelineDate.localeCompare(b.timelineDate));

  return sorted.map((video) => {
    const isTeaser = video.type === 'Teaser';
    const isFinal = !isTeaser && /final/i.test(video.name);
    return {
      date: video.timelineDate,
      title: isTeaser ? 'Teaser' : isFinal ? 'Final Trailer' : 'Trailer',
      kind: isTeaser ? 'teaser' : 'trailer',
      url: toYoutubeUrl(video),
    };
  });
}

function selectReleaseCountry(
  countries: TMDBCountryReleaseDates[] | undefined,
  country: string,
): TMDBCountryReleaseDates | null {
  if (!countries || countries.length === 0) return null;
  return (
    countries.find((entry) => entry.iso_3166_1 === country) ??
    countries.find((entry) => entry.iso_3166_1 === 'US') ??
    countries[0]
  );
}

function releaseTypeToEvent(type: number): { title: string; kind: ReleaseTimelineEventKind } | null {
  switch (type) {
    case 1:
      return { title: 'Premiere', kind: 'premiere' };
    case 2:
    case 3:
      return { title: 'Theatrical Release', kind: 'release' };
    case 4:
      return { title: 'Digital Release', kind: 'digital' };
    case 5:
      return { title: 'Blu-ray Release', kind: 'physical' };
    case 6:
      return { title: 'TV Release', kind: 'release' };
    default:
      return null;
  }
}

export function buildMovieReleaseTimeline(movie: TMDBMovieDetail, country: string): ReleaseTimelineEvent[] {
  const events: Omit<ReleaseTimelineEvent, 'id' | 'source'>[] = [];

  events.push(...buildVideoEvents(movie.videos?.results));

  const countryReleaseDates = selectReleaseCountry(movie.release_dates?.results, country);
  const releaseDateEvents = (countryReleaseDates?.release_dates ?? [])
    .map((entry) => {
      const date = dateOnly(entry.release_date);
      const mapped = releaseTypeToEvent(entry.type);
      if (!date || !mapped) return null;
      return {
        date,
        title: mapped.title,
        kind: mapped.kind,
      };
    })
    .filter((entry): entry is Omit<ReleaseTimelineEvent, 'id' | 'source'> => Boolean(entry));

  events.push(...releaseDateEvents);

  const hasTheatrical = releaseDateEvents.some((event) => event.title === 'Theatrical Release');
  const fallbackReleaseDate = dateOnly(movie.release_date);
  if (!hasTheatrical && fallbackReleaseDate) {
    events.push({
      date: fallbackReleaseDate,
      title: 'Theatrical Release',
      kind: 'release',
    });
  }

  return dedupeAndSort(events);
}

export function buildSeriesReleaseTimeline(series: TMDBSeriesDetail): ReleaseTimelineEvent[] {
  const events: Omit<ReleaseTimelineEvent, 'id' | 'source'>[] = [];

  events.push(...buildVideoEvents(series.videos?.results));

  const firstAirDate = dateOnly(series.first_air_date);
  if (firstAirDate) {
    events.push({
      date: firstAirDate,
      title: 'Series Premiere',
      kind: 'premiere',
    });
  }

  for (const season of series.seasons ?? []) {
    const airDate = dateOnly(season.air_date);
    if (!airDate) continue;
    events.push({
      date: airDate,
      title: `Season ${season.season_number} Premiere`,
      kind: 'season',
    });
  }

  const nextEpisodeDate = dateOnly(series.next_episode_to_air?.air_date ?? null);
  if (nextEpisodeDate && series.next_episode_to_air) {
    events.push({
      date: nextEpisodeDate,
      title: `S${series.next_episode_to_air.season_number}E${series.next_episode_to_air.episode_number}: ${series.next_episode_to_air.name}`,
      kind: 'episode',
    });
  }

  return dedupeAndSort(events);
}
