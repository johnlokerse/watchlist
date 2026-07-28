import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.TEST_DB_PATH ?? path.join(__dirname, '..', 'data', 'movie-tracker.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Auto-create tables on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS watched_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdbId INTEGER NOT NULL,
    contentType TEXT NOT NULL,
    title TEXT NOT NULL,
    posterPath TEXT,
    releaseDate TEXT,
    status TEXT NOT NULL,
    userRating REAL,
    notes TEXT DEFAULT '',
    genreIds TEXT DEFAULT '[]',
    watchedAt TEXT,
    addedAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(tmdbId, contentType)
  );

  CREATE TABLE IF NOT EXISTS watch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdbId INTEGER NOT NULL,
    contentType TEXT NOT NULL,
    watchedAt TEXT NOT NULL,
    note TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS series_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchedItemId INTEGER NOT NULL,
    tmdbId INTEGER NOT NULL UNIQUE,
    currentSeason INTEGER,
    currentEpisode INTEGER,
    totalSeasons INTEGER,
    totalEpisodes INTEGER
  );

  CREATE TABLE IF NOT EXISTS watched_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdbId INTEGER NOT NULL,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    UNIQUE(tmdbId, season, episode)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS watch_link_cache (
    cacheKey TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// Backward-compatible migration: add watchedAt to pre-existing DBs.
// SQLite has no "ADD COLUMN IF NOT EXISTS", so guard with PRAGMA.
const watchedItemsCols = db.prepare(`PRAGMA table_info(watched_items)`).all() as { name: string }[];
if (!watchedItemsCols.some((c) => c.name === 'watchedAt')) {
  db.exec(`ALTER TABLE watched_items ADD COLUMN watchedAt TEXT`);
}

// New-season tracking columns. Added separately so pre-existing databases pick them up.
const seriesProgressCols = db.prepare(`PRAGMA table_info(series_progress)`).all() as { name: string }[];
for (const [name, type] of [
  ['newSeasonNumber', 'INTEGER'],
  ['newSeasonState', 'TEXT'],
  ['newSeasonAirDate', 'TEXT'],
  ['lastCheckedAt', 'TEXT'],
] as const) {
  if (!seriesProgressCols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE series_progress ADD COLUMN ${name} ${type}`);
  }
}

const stmts = {
  // watched_items
  getAllItems: db.prepare(`SELECT * FROM watched_items ORDER BY addedAt DESC`),
  getItemsByType: db.prepare(`SELECT * FROM watched_items WHERE contentType = ? ORDER BY addedAt DESC`),
  getItemsByTypeAndStatus: db.prepare(`SELECT * FROM watched_items WHERE contentType = ? AND status = ? ORDER BY addedAt DESC`),
  getItemByTmdb: db.prepare(`SELECT * FROM watched_items WHERE tmdbId = ? AND contentType = ?`),
  getItemById: db.prepare(`SELECT * FROM watched_items WHERE id = ?`),
  insertItem: db.prepare(`
    INSERT INTO watched_items (tmdbId, contentType, title, posterPath, releaseDate, status, userRating, notes, genreIds, watchedAt, addedAt, updatedAt)
    VALUES (@tmdbId, @contentType, @title, @posterPath, @releaseDate, @status, @userRating, @notes, @genreIds, @watchedAt, @addedAt, @updatedAt)
  `),
  upsertItem: db.prepare(`
    INSERT INTO watched_items (tmdbId, contentType, title, posterPath, releaseDate, status, userRating, notes, genreIds, watchedAt, addedAt, updatedAt)
    VALUES (@tmdbId, @contentType, @title, @posterPath, @releaseDate, @status, @userRating, @notes, @genreIds, @watchedAt, @addedAt, @updatedAt)
    ON CONFLICT(tmdbId, contentType) DO UPDATE SET
      title=excluded.title, posterPath=excluded.posterPath, releaseDate=excluded.releaseDate,
      status=excluded.status, userRating=excluded.userRating, notes=excluded.notes,
      genreIds=excluded.genreIds, watchedAt=COALESCE(excluded.watchedAt, watched_items.watchedAt), updatedAt=excluded.updatedAt
  `),
  updateItem: db.prepare(`UPDATE watched_items SET title=COALESCE(@title,title), posterPath=COALESCE(@posterPath,posterPath), releaseDate=COALESCE(@releaseDate,releaseDate), status=COALESCE(@status,status), userRating=@userRating, notes=COALESCE(@notes,notes), genreIds=COALESCE(@genreIds,genreIds), watchedAt=COALESCE(@watchedAt,watchedAt), updatedAt=@updatedAt WHERE id=@id`),
  deleteItem: db.prepare(`DELETE FROM watched_items WHERE id = ?`),

  // series_progress
  getProgress: db.prepare(`SELECT * FROM series_progress WHERE tmdbId = ?`),
  getAllProgressRows: db.prepare(`SELECT * FROM series_progress`),
  getPendingSeasonChecks: db.prepare(`
    SELECT i.tmdbId FROM watched_items i
    LEFT JOIN series_progress p ON p.tmdbId = i.tmdbId
    WHERE i.contentType = 'series' AND i.status IN ('watching', 'watched')
      AND (p.lastCheckedAt IS NULL OR p.lastCheckedAt < ?)
    ORDER BY p.lastCheckedAt IS NOT NULL, p.lastCheckedAt ASC
    LIMIT ?
  `),
  updateSeasonCheck: db.prepare(`
    UPDATE series_progress SET
      totalSeasons=@totalSeasons, totalEpisodes=@totalEpisodes,
      newSeasonNumber=@newSeasonNumber, newSeasonState=@newSeasonState,
      newSeasonAirDate=@newSeasonAirDate, lastCheckedAt=@lastCheckedAt
    WHERE tmdbId=@tmdbId
  `),
  clearNewSeasonFlag: db.prepare(`
    UPDATE series_progress
    SET newSeasonNumber=NULL, newSeasonState=NULL, newSeasonAirDate=NULL
    WHERE tmdbId = ?
  `),
  updateProgressTotals: db.prepare(`UPDATE series_progress SET totalSeasons=?, totalEpisodes=? WHERE tmdbId = ?`),
  upsertProgress: db.prepare(`
    INSERT INTO series_progress (watchedItemId, tmdbId, currentSeason, currentEpisode, totalSeasons, totalEpisodes)
    VALUES (@watchedItemId, @tmdbId, @currentSeason, @currentEpisode, @totalSeasons, @totalEpisodes)
    ON CONFLICT(tmdbId) DO UPDATE SET
      watchedItemId=excluded.watchedItemId, currentSeason=excluded.currentSeason,
      currentEpisode=excluded.currentEpisode, totalSeasons=excluded.totalSeasons,
      totalEpisodes=excluded.totalEpisodes
  `),
  deleteProgressByItem: db.prepare(`DELETE FROM series_progress WHERE watchedItemId = ?`),

  // watched_episodes
  getEpisodes: db.prepare(`SELECT * FROM watched_episodes WHERE tmdbId = ? AND season = ?`),
  getEpisode: db.prepare(`SELECT * FROM watched_episodes WHERE tmdbId = ? AND season = ? AND episode = ?`),
  insertEpisode: db.prepare(`INSERT OR IGNORE INTO watched_episodes (tmdbId, season, episode) VALUES (?, ?, ?)`),
  deleteEpisode: db.prepare(`DELETE FROM watched_episodes WHERE id = ?`),
  deleteSeasonEpisodes: db.prepare(`DELETE FROM watched_episodes WHERE tmdbId = ? AND season = ?`),

  // settings
  getSetting: db.prepare(`SELECT value FROM settings WHERE key = ?`),
  getAllSettings: db.prepare(`SELECT key, value FROM settings`),
  upsertSetting: db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`),

  // watch link cache
  getWatchLinkCache: db.prepare(`SELECT payload, expiresAt FROM watch_link_cache WHERE cacheKey = ?`),
  upsertWatchLinkCache: db.prepare(`
    INSERT INTO watch_link_cache (cacheKey, payload, expiresAt, updatedAt)
    VALUES (@cacheKey, @payload, @expiresAt, @updatedAt)
    ON CONFLICT(cacheKey) DO UPDATE SET
      payload=excluded.payload,
      expiresAt=excluded.expiresAt,
      updatedAt=excluded.updatedAt
  `),

  countWatchedEpisodes: db.prepare(`SELECT COUNT(*) as count FROM watched_episodes WHERE tmdbId = ?`),
  updateItemStatusByTmdb: db.prepare(`UPDATE watched_items SET status = ?, updatedAt = ? WHERE tmdbId = ? AND contentType = 'series'`),
  updateItemStatusAndWatchedAtByTmdb: db.prepare(`UPDATE watched_items SET status = ?, watchedAt = ?, updatedAt = ? WHERE tmdbId = ? AND contentType = 'series'`),
  updateWatchedAtByTmdb: db.prepare(`UPDATE watched_items SET watchedAt = ? WHERE tmdbId = ? AND contentType = ?`),

  // watch_log (append-only rewatch history)
  insertWatchLog: db.prepare(`INSERT INTO watch_log (tmdbId, contentType, watchedAt, note) VALUES (@tmdbId, @contentType, @watchedAt, @note)`),
  getWatchLog: db.prepare(`SELECT * FROM watch_log WHERE tmdbId = ? AND contentType = ? ORDER BY watchedAt DESC, id DESC`),
  getWatchLogById: db.prepare(`SELECT * FROM watch_log WHERE id = ?`),
  deleteWatchLog: db.prepare(`DELETE FROM watch_log WHERE id = ?`),
  getLatestWatchLog: db.prepare(`SELECT MAX(watchedAt) as latest FROM watch_log WHERE tmdbId = ? AND contentType = ?`),
  getAllWatchLog: db.prepare(`SELECT * FROM watch_log ORDER BY id ASC`),
  clearWatchLog: db.prepare(`DELETE FROM watch_log`),

  // bulk / migration
  clearAll: db.prepare(`DELETE FROM watched_items`),
  clearProgress: db.prepare(`DELETE FROM series_progress`),
  clearEpisodes: db.prepare(`DELETE FROM watched_episodes`),

  // export
  getAllProgress: db.prepare(`SELECT * FROM series_progress`),
  getAllEpisodes: db.prepare(`SELECT * FROM watched_episodes`),
};

export interface WatchedItemRow {
  id: number;
  tmdbId: number;
  contentType: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  status: string;
  userRating: number | null;
  notes: string;
  genreIds: string; // JSON array
  watchedAt: string | null;
  addedAt: string;
  updatedAt: string;
}

export interface WatchLogRow {
  id: number;
  tmdbId: number;
  contentType: string;
  watchedAt: string;
  note: string;
}

export type NewSeasonState = 'announced' | 'airing';

export interface SeriesProgressRow {
  id: number;
  watchedItemId: number;
  tmdbId: number;
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  totalEpisodes: number;
  newSeasonNumber: number | null;
  newSeasonState: NewSeasonState | null;
  newSeasonAirDate: string | null;
  lastCheckedAt: string | null;
}

export interface SeasonSummary {
  season: number;
  airDate: string | null;
  episodeCount: number;
}

/** Compact TMDB summary posted by the client for a single series. */
export interface SeasonCheckInput {
  tmdbId: number;
  /** Every non-special season TMDB knows about, so gaps and placeholders are visible. */
  seasons?: SeasonSummary[];
  /** Highest non-special season number known to TMDB. */
  latestSeason: number;
  /** Air date of that season, when TMDB has one. */
  latestSeasonAirDate?: string | null;
  /** Episode count across all non-special seasons. */
  numberOfEpisodes: number;
  /** Season/episode of the most recently aired episode, when known. */
  lastAiredSeason?: number | null;
  lastAiredEpisode?: number | null;
}

export interface SeasonCheckResult {
  tmdbId: number;
  status: string;
  newSeasonNumber: number | null;
  newSeasonState: NewSeasonState | null;
  changed: boolean;
}

/** Convert a DB row to the frontend-friendly shape (parse genreIds JSON) */
function rowToItem(row: WatchedItemRow) {
  return {
    ...row,
    genreIds: JSON.parse(row.genreIds || '[]') as number[],
  };
}

/**
 * After any episode insert/delete, check if the total watched episodes now
 * equals the series' totalEpisodes. If so, auto-set status to 'watched'.
 * If the series was 'watched' but an episode was removed, revert to 'watching'.
 * Only acts when the current status is 'watching' or 'watched'.
 */
function checkAndUpdateSeriesStatus(tmdbId: number) {
  const progress = stmts.getProgress.get(tmdbId) as SeriesProgressRow | undefined;
  if (!progress || !progress.totalEpisodes) return;

  const { count } = stmts.countWatchedEpisodes.get(tmdbId) as { count: number };
  const item = stmts.getItemByTmdb.get(tmdbId, 'series') as WatchedItemRow | undefined;
  if (!item) return;

  if (item.status !== 'watching' && item.status !== 'watched') return;

  const newStatus = count >= progress.totalEpisodes ? 'watched' : 'watching';
  if (newStatus === 'watched' && progress.newSeasonState) {
    // Everything TMDB knows about is watched, so the new-season signal is stale.
    stmts.clearNewSeasonFlag.run(tmdbId);
  }
  if (item.status !== newStatus) {
    const now = new Date().toISOString();
    if (newStatus === 'watched' && item.watchedAt == null) {
      stmts.updateItemStatusAndWatchedAtByTmdb.run(newStatus, now, now, tmdbId);
      stmts.insertWatchLog.run({ tmdbId, contentType: 'series', watchedAt: now, note: '' });
    } else {
      stmts.updateItemStatusByTmdb.run(newStatus, now, tmdbId);
    }
  }
}

/**
 * Once the user watches anything from the flagged season, the badge has served
 * its purpose — drop it and adopt the new season as the accepted baseline.
 */
function acknowledgeNewSeason(tmdbId: number, season: number) {
  const progress = stmts.getProgress.get(tmdbId) as SeriesProgressRow | undefined;
  if (!progress?.newSeasonNumber || season < progress.newSeasonNumber) return;
  stmts.updateProgressTotals.run(
    Math.max(progress.totalSeasons ?? 0, progress.newSeasonNumber),
    progress.totalEpisodes,
    tmdbId,
  );
  stmts.clearNewSeasonFlag.run(tmdbId);
}

function isAired(date: string | null | undefined): boolean {
  return !!date && date <= new Date().toISOString().slice(0, 10);
}

/** Normalised, ascending season list; falls back to the legacy single-season payload. */
function seasonList(input: SeasonCheckInput): SeasonSummary[] {
  if (input.seasons?.length) {
    return input.seasons.filter((s) => s.season > 0).sort((a, b) => a.season - b.season);
  }
  if (!input.latestSeason) return [];
  return [
    {
      season: input.latestSeason,
      airDate: input.latestSeasonAirDate ?? null,
      episodeCount: input.numberOfEpisodes,
    },
  ];
}

function hasAired(season: SeasonSummary, input: SeasonCheckInput): boolean {
  if (isAired(season.airDate)) return true;
  return input.lastAiredSeason != null && input.lastAiredSeason >= season.season;
}

/**
 * TMDB frequently lists the next season as a stub with no air date and no
 * episodes long before anything is actually confirmed. Those are noise, not an
 * announcement.
 */
function isPlaceholder(season: SeasonSummary): boolean {
  return !season.airDate && season.episodeCount <= 0;
}

/**
 * Reconcile one series against the current TMDB season line-up.
 *
 * `totalSeasons` is the baseline the user has accepted. It is never advanced by
 * a check — only by the user actually watching something from the new season
 * (`acknowledgeNewSeason`) — so the flag survives repeated checks and an
 * announced season is still detected once it starts airing.
 */
function applySeasonCheck(input: SeasonCheckInput): SeasonCheckResult | null {
  const item = stmts.getItemByTmdb.get(input.tmdbId, 'series') as WatchedItemRow | undefined;
  if (!item) return null;

  const now = new Date().toISOString();
  let progress = stmts.getProgress.get(input.tmdbId) as SeriesProgressRow | undefined;
  if (!progress) {
    // Items added without progress (imports, API seeds) still need a baseline row.
    stmts.upsertProgress.run({
      watchedItemId: item.id,
      tmdbId: input.tmdbId,
      currentSeason: 1,
      currentEpisode: 0,
      totalSeasons: 0,
      totalEpisodes: 0,
    });
    progress = stmts.getProgress.get(input.tmdbId) as SeriesProgressRow;
  }

  // Only tracked series participate; planned series have no progress to reconcile.
  if (item.status !== 'watching' && item.status !== 'watched') {
    stmts.updateSeasonCheck.run({
      tmdbId: input.tmdbId,
      totalSeasons: progress.totalSeasons,
      totalEpisodes: progress.totalEpisodes,
      newSeasonNumber: null,
      newSeasonState: null,
      newSeasonAirDate: null,
      lastCheckedAt: now,
    });
    return { tmdbId: input.tmdbId, status: item.status, newSeasonNumber: null, newSeasonState: null, changed: false };
  }

  const seasons = seasonList(input);
  const baseline = progress.totalSeasons ?? 0;

  let newSeasonNumber: number | null = null;
  let newSeasonState: NewSeasonState | null = null;
  let newSeasonAirDate: string | null = null;
  const totalSeasons = progress.totalSeasons;
  let totalEpisodes = progress.totalEpisodes;

  /** Episodes up to and including `season`, so unaired seasons never inflate the total. */
  const episodesThrough = (season: number) =>
    seasons.length
      ? seasons.filter((s) => s.season <= season).reduce((sum, s) => sum + s.episodeCount, 0)
      : input.numberOfEpisodes;

  if (item.status === 'watching' && !progress.newSeasonState) {
    // The user is already working through this series. Adopt the latest real
    // season silently; the new-season signal is reserved for series that the
    // app moved from Watched back to Watching.
    const meaningful = seasons.filter((season) => !isPlaceholder(season));
    const aired = seasons.filter((season) => hasAired(season, input));
    const adoptedSeason = meaningful.length
      ? meaningful[meaningful.length - 1].season
      : baseline;
    const latestAiredSeason = aired.length ? aired[aired.length - 1].season : baseline;
    const adoptedEpisodes = episodesThrough(latestAiredSeason) || progress.totalEpisodes;

    stmts.updateSeasonCheck.run({
      tmdbId: input.tmdbId,
      totalSeasons: Math.max(baseline, adoptedSeason),
      totalEpisodes: adoptedEpisodes,
      newSeasonNumber: null,
      newSeasonState: null,
      newSeasonAirDate: null,
      lastCheckedAt: now,
    });
    return {
      tmdbId: input.tmdbId,
      status: item.status,
      newSeasonNumber: null,
      newSeasonState: null,
      changed: false,
    };
  }

  if (!baseline) {
    // No usable baseline (fresh or imported row) — record one instead of
    // reporting every existing season as new. Anchor it to the newest season
    // that has actually aired so a pending season is still picked up later.
    const aired = seasons.filter((s) => hasAired(s, input));
    const anchor = aired.length ? aired[aired.length - 1].season : input.latestSeason ?? 0;
    stmts.updateProgressTotals.run(anchor, episodesThrough(anchor) || input.numberOfEpisodes, input.tmdbId);
    stmts.updateSeasonCheck.run({
      tmdbId: input.tmdbId,
      totalSeasons: anchor,
      totalEpisodes: episodesThrough(anchor) || input.numberOfEpisodes,
      newSeasonNumber: null,
      newSeasonState: null,
      newSeasonAirDate: null,
      lastCheckedAt: now,
    });
    return { tmdbId: input.tmdbId, status: item.status, newSeasonNumber: null, newSeasonState: null, changed: false };
  }

  const ahead = seasons.filter((s) => s.season > baseline);
  const aired = ahead.filter((s) => hasAired(s, input));

  if (aired.length) {
    // Prefer the newest season that is actually out — a placeholder for a later
    // season must not mask the one the user can watch right now.
    const target = aired[aired.length - 1];
    newSeasonNumber = target.season;
    newSeasonAirDate = target.airDate;
    newSeasonState = 'airing';
    totalEpisodes = episodesThrough(target.season);
  } else {
    const upcoming = ahead.find((s) => !isPlaceholder(s));
    if (upcoming) {
      newSeasonNumber = upcoming.season;
      newSeasonAirDate = upcoming.airDate;
      newSeasonState = 'announced';
      // Totals stay frozen: nothing new is watchable yet.
    } else {
      totalEpisodes = episodesThrough(baseline);
    }
  }

  stmts.updateSeasonCheck.run({
    tmdbId: input.tmdbId,
    totalSeasons,
    totalEpisodes,
    newSeasonNumber,
    newSeasonState,
    newSeasonAirDate,
    lastCheckedAt: now,
  });

  let status = item.status;
  if (item.status === 'watched' && shouldResumeWatching(input, newSeasonState)) {
    status = 'watching';
    stmts.updateItemStatusByTmdb.run(status, now, input.tmdbId);
  }

  return {
    tmdbId: input.tmdbId,
    status,
    newSeasonNumber,
    newSeasonState,
    changed: status !== item.status || newSeasonState !== progress.newSeasonState,
  };
}

/**
 * A completed series goes back to "watching" when the new season is actually
 * airing, or — for users who tick episodes — when the latest aired episode of
 * an already-known season is still unwatched.
 */
function shouldResumeWatching(input: SeasonCheckInput, newSeasonState: NewSeasonState | null): boolean {
  if (newSeasonState === 'airing') return true;
  if (newSeasonState === 'announced') return false;

  const { lastAiredSeason, lastAiredEpisode } = input;
  if (lastAiredSeason == null || lastAiredEpisode == null || lastAiredSeason < 1) return false;

  // Without any episode ticks we cannot tell "seen it all" from "never tracked",
  // so stay put rather than un-completing a manually watched series.
  const { count } = stmts.countWatchedEpisodes.get(input.tmdbId) as { count: number };
  if (count === 0) return false;

  return !stmts.getEpisode.get(input.tmdbId, lastAiredSeason, lastAiredEpisode);
}

export const queries = {
  getAllItems(contentType?: string, status?: string) {
    let rows: WatchedItemRow[];
    if (contentType && status) rows = stmts.getItemsByTypeAndStatus.all(contentType, status) as WatchedItemRow[];
    else if (contentType) rows = stmts.getItemsByType.all(contentType) as WatchedItemRow[];
    else rows = stmts.getAllItems.all() as WatchedItemRow[];
    return rows.map(rowToItem);
  },

  getItemByTmdb(tmdbId: number, contentType: string) {
    const row = stmts.getItemByTmdb.get(tmdbId, contentType) as WatchedItemRow | undefined;
    return row ? rowToItem(row) : null;
  },

  addItem(item: {
    tmdbId: number; contentType: string; title: string; posterPath?: string | null;
    releaseDate?: string | null; status: string; userRating?: number | null;
    notes?: string; genreIds?: number[]; watchedAt?: string | null;
  }) {
    const existing = stmts.getItemByTmdb.get(item.tmdbId, item.contentType) as WatchedItemRow | undefined;
    if (existing) return existing.id;
    const now = new Date().toISOString();
    const result = stmts.insertItem.run({
      tmdbId: item.tmdbId,
      contentType: item.contentType,
      title: item.title,
      posterPath: item.posterPath ?? null,
      releaseDate: item.releaseDate ?? null,
      status: item.status,
      userRating: item.userRating ?? null,
      notes: item.notes ?? '',
      genreIds: JSON.stringify(item.genreIds ?? []),
      watchedAt: item.watchedAt ?? null,
      addedAt: now,
      updatedAt: now,
    });
    return Number(result.lastInsertRowid);
  },

  updateItem(id: number, changes: Record<string, unknown>) {
    const now = new Date().toISOString();
    const existing = stmts.getItemById.get(id) as WatchedItemRow | undefined;

    // Auto-stamp watchedAt + append a watch_log entry when an item first
    // transitions to "watched" (and no explicit watchedAt was provided).
    let watchedAt = (changes.watchedAt as string) ?? null;
    let stampLog = false;
    if (
      changes.status === 'watched' &&
      existing &&
      existing.watchedAt == null &&
      watchedAt == null
    ) {
      watchedAt = now;
      stampLog = true;
    }

    stmts.updateItem.run({
      id,
      title: (changes.title as string) ?? null,
      posterPath: (changes.posterPath as string) ?? null,
      releaseDate: (changes.releaseDate as string) ?? null,
      status: (changes.status as string) ?? null,
      userRating: changes.userRating !== undefined ? (changes.userRating as number | null) : null,
      notes: (changes.notes as string) ?? null,
      genreIds: changes.genreIds ? JSON.stringify(changes.genreIds) : null,
      watchedAt,
      updatedAt: now,
    });

    if (stampLog && existing) {
      stmts.insertWatchLog.run({
        tmdbId: existing.tmdbId,
        contentType: existing.contentType,
        watchedAt: now,
        note: '',
      });
    }

    // Manually choosing either active/completed state dismisses the signal. The
    // automatic watched-to-watching transition bypasses this method, so its
    // badge remains until the user starts the new season.
    if (
      (changes.status === 'watched' || changes.status === 'watching') &&
      existing?.contentType === 'series'
    ) {
      acknowledgeNewSeason(existing.tmdbId, Number.MAX_SAFE_INTEGER);
    }
  },

  deleteItem(id: number) {
    stmts.deleteProgressByItem.run(id);
    stmts.deleteItem.run(id);
  },

  getProgress(tmdbId: number) {
    return stmts.getProgress.get(tmdbId) ?? null;
  },

  upsertProgress(p: { watchedItemId: number; tmdbId: number; currentSeason: number; currentEpisode: number; totalSeasons: number; totalEpisodes: number }) {
    // Keep the accepted baseline frozen while a new season is flagged, otherwise
    // simply viewing the detail page would silently dismiss the badge.
    const existing = stmts.getProgress.get(p.tmdbId) as SeriesProgressRow | undefined;
    if (existing?.newSeasonState) {
      stmts.upsertProgress.run({ ...p, totalSeasons: existing.totalSeasons, totalEpisodes: existing.totalEpisodes });
      return;
    }
    stmts.upsertProgress.run(p);
  },

  getAllProgress() {
    return stmts.getAllProgressRows.all() as SeriesProgressRow[];
  },

  /** tmdbIds of tracked series whose TMDB data has not been checked recently. */
  getPendingSeasonChecks(maxAgeMs = 12 * 60 * 60 * 1000, limit = 20) {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const rows = stmts.getPendingSeasonChecks.all(cutoff, limit) as { tmdbId: number }[];
    return rows.map((r) => r.tmdbId);
  },

  applySeasonChecks(inputs: SeasonCheckInput[]) {
    const results: SeasonCheckResult[] = [];
    const tx = db.transaction(() => {
      for (const input of inputs) {
        const result = applySeasonCheck(input);
        if (result) results.push(result);
      }
    });
    tx();
    return results;
  },

  getEpisodes(tmdbId: number, season: number) {
    return stmts.getEpisodes.all(tmdbId, season);
  },

  toggleEpisode(tmdbId: number, season: number, episode: number) {
    const existing = stmts.getEpisode.get(tmdbId, season, episode) as { id: number } | undefined;
    if (existing) {
      stmts.deleteEpisode.run(existing.id);
      checkAndUpdateSeriesStatus(tmdbId);
      return { action: 'removed' };
    }
    stmts.insertEpisode.run(tmdbId, season, episode);
    acknowledgeNewSeason(tmdbId, season);
    checkAndUpdateSeriesStatus(tmdbId);
    return { action: 'added' };
  },

  markSeasonWatched(tmdbId: number, season: number, episodes: number[]) {
    const tx = db.transaction(() => {
      stmts.deleteSeasonEpisodes.run(tmdbId, season);
      for (const ep of episodes) {
        stmts.insertEpisode.run(tmdbId, season, ep);
      }
    });
    tx();
    if (episodes.length > 0) acknowledgeNewSeason(tmdbId, season);
    checkAndUpdateSeriesStatus(tmdbId);
  },

  getWatchLog(tmdbId: number, contentType: string) {
    return stmts.getWatchLog.all(tmdbId, contentType) as WatchLogRow[];
  },

  /** Append a rewatch entry and sync watched_items.watchedAt to the latest entry. */
  addWatchLog(entry: { tmdbId: number; contentType: string; watchedAt?: string | null; note?: string }) {
    const watchedAt = entry.watchedAt ?? new Date().toISOString();
    const result = stmts.insertWatchLog.run({
      tmdbId: entry.tmdbId,
      contentType: entry.contentType,
      watchedAt,
      note: entry.note ?? '',
    });
    const { latest } = stmts.getLatestWatchLog.get(entry.tmdbId, entry.contentType) as { latest: string | null };
    if (latest) stmts.updateWatchedAtByTmdb.run(latest, entry.tmdbId, entry.contentType);
    return Number(result.lastInsertRowid);
  },

  deleteWatchLog(id: number) {
    const row = stmts.getWatchLogById.get(id) as WatchLogRow | undefined;
    stmts.deleteWatchLog.run(id);
    if (row) {
      const { latest } = stmts.getLatestWatchLog.get(row.tmdbId, row.contentType) as { latest: string | null };
      stmts.updateWatchedAtByTmdb.run(latest ?? null, row.tmdbId, row.contentType);
    }
  },

  migrate(data: { items: unknown[]; progress: unknown[]; episodes: unknown[]; watchLog?: unknown[] }) {
    const tx = db.transaction(() => {
      for (const item of data.items as Record<string, unknown>[]) {
        const now = new Date().toISOString();
        stmts.upsertItem.run({
          tmdbId: item.tmdbId as number,
          contentType: item.contentType as string,
          title: item.title as string,
          posterPath: (item.posterPath as string) ?? null,
          releaseDate: (item.releaseDate as string) ?? null,
          status: item.status as string,
          userRating: (item.userRating as number) ?? null,
          notes: (item.notes as string) ?? '',
          genreIds: JSON.stringify((item.genreIds as number[]) ?? []),
          watchedAt: (item.watchedAt as string) ?? null,
          addedAt: (item.addedAt as string) ?? now,
          updatedAt: (item.updatedAt as string) ?? now,
        });
      }
      for (const p of data.progress as Record<string, unknown>[]) {
        const tmdbId = p.tmdbId as number;
        const row = stmts.getItemByTmdb.get(tmdbId, 'series') as WatchedItemRow | undefined;
        if (row) {
          stmts.upsertProgress.run({
            watchedItemId: row.id,
            tmdbId,
            currentSeason: (p.currentSeason as number) ?? 0,
            currentEpisode: (p.currentEpisode as number) ?? 0,
            totalSeasons: (p.totalSeasons as number) ?? 0,
            totalEpisodes: (p.totalEpisodes as number) ?? 0,
          });
        }
      }
      for (const e of data.episodes as Record<string, unknown>[]) {
        stmts.insertEpisode.run(e.tmdbId as number, e.season as number, e.episode as number);
      }
      for (const w of (data.watchLog ?? []) as Record<string, unknown>[]) {
        if (w.tmdbId == null || w.contentType == null || w.watchedAt == null) continue;
        stmts.insertWatchLog.run({
          tmdbId: w.tmdbId as number,
          contentType: w.contentType as string,
          watchedAt: w.watchedAt as string,
          note: (w.note as string) ?? '',
        });
      }
    });
    tx();
  },

  clearAll() {
    const tx = db.transaction(() => {
      stmts.clearEpisodes.run();
      stmts.clearProgress.run();
      stmts.clearWatchLog.run();
      stmts.clearAll.run();
    });
    tx();
  },

  /** Bulk INSERT OR IGNORE — used by the JSON import flow. */
  bulkInsertEpisodes(entries: { tmdbId: number; season: number; episode: number }[]) {
    const tx = db.transaction(() => {
      for (const e of entries) {
        stmts.insertEpisode.run(e.tmdbId, e.season, e.episode);
      }
    });
    tx();
  },

  getSettings(): Record<string, unknown> {
    const rows = stmts.getAllSettings.all() as { key: string; value: string }[];
    const result: Record<string, unknown> = {};
    for (const { key, value } of rows) {
      try { result[key] = JSON.parse(value); } catch { result[key] = value; }
    }
    return result;
  },

  saveSettings(settings: Record<string, unknown>) {
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        stmts.upsertSetting.run(key, JSON.stringify(value));
      }
    });
    tx();
  },

  getWatchLinkCache(cacheKey: string) {
    const row = stmts.getWatchLinkCache.get(cacheKey) as { payload: string; expiresAt: string } | undefined;
    if (!row || Date.parse(row.expiresAt) <= Date.now()) return null;
    try {
      return JSON.parse(row.payload) as unknown;
    } catch {
      return null;
    }
  },

  saveWatchLinkCache(cacheKey: string, payload: unknown, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    const now = new Date();
    stmts.upsertWatchLinkCache.run({
      cacheKey,
      payload: JSON.stringify(payload),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      updatedAt: now.toISOString(),
    });
  },

  exportAll() {
    const items = (stmts.getAllItems.all() as WatchedItemRow[]).map(rowToItem);
    const progress = (stmts.getAllProgress.all() as {
      id: number; watchedItemId: number; tmdbId: number;
      currentSeason: number; currentEpisode: number;
      totalSeasons: number; totalEpisodes: number;
    }[]).map(({ tmdbId, currentSeason, currentEpisode, totalSeasons, totalEpisodes }) => ({
      tmdbId, currentSeason, currentEpisode, totalSeasons, totalEpisodes,
    }));
    const episodes = (stmts.getAllEpisodes.all() as {
      id: number; tmdbId: number; season: number; episode: number;
    }[]).map(({ tmdbId, season, episode }) => ({ tmdbId, season, episode }));
    const watchLog = (stmts.getAllWatchLog.all() as WatchLogRow[]).map(
      ({ tmdbId, contentType, watchedAt, note }) => ({
        tmdbId, contentType, watchedAt,
        ...(note && { note }),
      }),
    );
    return {
      items: items.map(({ tmdbId, title, contentType, status, posterPath, releaseDate, userRating, notes, watchedAt }) => ({
        tmdbId, title, contentType, status, posterPath, releaseDate,
        ...(userRating != null && { userRating }),
        ...(notes && { notes }),
        ...(watchedAt != null && { watchedAt }),
      })),
      progress,
      episodes,
      watchLog,
    };
  },
};

export { db as sqliteDb };
