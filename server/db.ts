import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'movie-tracker.db');

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
    addedAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(tmdbId, contentType)
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
`);

// Prepared statements for performance
const stmts = {
  // watched_items
  getAllItems: db.prepare(`SELECT * FROM watched_items ORDER BY addedAt DESC`),
  getItemsByType: db.prepare(`SELECT * FROM watched_items WHERE contentType = ? ORDER BY addedAt DESC`),
  getItemsByTypeAndStatus: db.prepare(`SELECT * FROM watched_items WHERE contentType = ? AND status = ? ORDER BY addedAt DESC`),
  getItemByTmdb: db.prepare(`SELECT * FROM watched_items WHERE tmdbId = ? AND contentType = ?`),
  getItemById: db.prepare(`SELECT * FROM watched_items WHERE id = ?`),
  insertItem: db.prepare(`
    INSERT INTO watched_items (tmdbId, contentType, title, posterPath, releaseDate, status, userRating, notes, genreIds, addedAt, updatedAt)
    VALUES (@tmdbId, @contentType, @title, @posterPath, @releaseDate, @status, @userRating, @notes, @genreIds, @addedAt, @updatedAt)
  `),
  upsertItem: db.prepare(`
    INSERT INTO watched_items (tmdbId, contentType, title, posterPath, releaseDate, status, userRating, notes, genreIds, addedAt, updatedAt)
    VALUES (@tmdbId, @contentType, @title, @posterPath, @releaseDate, @status, @userRating, @notes, @genreIds, @addedAt, @updatedAt)
    ON CONFLICT(tmdbId, contentType) DO UPDATE SET
      title=excluded.title, posterPath=excluded.posterPath, releaseDate=excluded.releaseDate,
      status=excluded.status, userRating=excluded.userRating, notes=excluded.notes,
      genreIds=excluded.genreIds, updatedAt=excluded.updatedAt
  `),
  updateItem: db.prepare(`UPDATE watched_items SET title=COALESCE(@title,title), posterPath=COALESCE(@posterPath,posterPath), releaseDate=COALESCE(@releaseDate,releaseDate), status=COALESCE(@status,status), userRating=@userRating, notes=COALESCE(@notes,notes), genreIds=COALESCE(@genreIds,genreIds), updatedAt=@updatedAt WHERE id=@id`),
  deleteItem: db.prepare(`DELETE FROM watched_items WHERE id = ?`),

  // series_progress
  getProgress: db.prepare(`SELECT * FROM series_progress WHERE tmdbId = ?`),
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

  // bulk / migration
  clearAll: db.prepare(`DELETE FROM watched_items`),
  clearProgress: db.prepare(`DELETE FROM series_progress`),
  clearEpisodes: db.prepare(`DELETE FROM watched_episodes`),
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
  addedAt: string;
  updatedAt: string;
}

/** Convert a DB row to the frontend-friendly shape (parse genreIds JSON) */
function rowToItem(row: WatchedItemRow) {
  return {
    ...row,
    genreIds: JSON.parse(row.genreIds || '[]') as number[],
  };
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
    notes?: string; genreIds?: number[];
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
      addedAt: now,
      updatedAt: now,
    });
    return Number(result.lastInsertRowid);
  },

  updateItem(id: number, changes: Record<string, unknown>) {
    const now = new Date().toISOString();
    stmts.updateItem.run({
      id,
      title: (changes.title as string) ?? null,
      posterPath: (changes.posterPath as string) ?? null,
      releaseDate: (changes.releaseDate as string) ?? null,
      status: (changes.status as string) ?? null,
      userRating: changes.userRating !== undefined ? (changes.userRating as number | null) : null,
      notes: (changes.notes as string) ?? null,
      genreIds: changes.genreIds ? JSON.stringify(changes.genreIds) : null,
      updatedAt: now,
    });
  },

  deleteItem(id: number) {
    stmts.deleteProgressByItem.run(id);
    stmts.deleteItem.run(id);
  },

  getProgress(tmdbId: number) {
    return stmts.getProgress.get(tmdbId) ?? null;
  },

  upsertProgress(p: { watchedItemId: number; tmdbId: number; currentSeason: number; currentEpisode: number; totalSeasons: number; totalEpisodes: number }) {
    stmts.upsertProgress.run(p);
  },

  getEpisodes(tmdbId: number, season: number) {
    return stmts.getEpisodes.all(tmdbId, season);
  },

  toggleEpisode(tmdbId: number, season: number, episode: number) {
    const existing = stmts.getEpisode.get(tmdbId, season, episode) as { id: number } | undefined;
    if (existing) {
      stmts.deleteEpisode.run(existing.id);
      return { action: 'removed' };
    }
    stmts.insertEpisode.run(tmdbId, season, episode);
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
  },

  migrate(data: { items: unknown[]; progress: unknown[]; episodes: unknown[] }) {
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
    });
    tx();
  },

  clearAll() {
    const tx = db.transaction(() => {
      stmts.clearEpisodes.run();
      stmts.clearProgress.run();
      stmts.clearAll.run();
    });
    tx();
  },

  exportAll() {
    const items = (stmts.getAllItems.all() as WatchedItemRow[]).map(rowToItem);
    return items.map(({ tmdbId, title, contentType, status, posterPath, releaseDate, userRating, notes }) => ({
      tmdbId, title, contentType, status, posterPath, releaseDate,
      ...(userRating != null && { userRating }),
      ...(notes && { notes }),
    }));
  },
};

export { db as sqliteDb };
