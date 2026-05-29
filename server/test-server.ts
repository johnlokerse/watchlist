/**
 * Test server — same REST API as server/index.ts but with:
 * - No real CopilotClient (stubbed chat endpoints)
 * - In-memory SQLite via TEST_DB_PATH=:memory: from .env.test
 *
 * Used exclusively by Playwright tests via playwright.config.ts webServer.
 */
import express, { type Request } from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { queries } from './db.js';
import { getAppVersion } from './app-info.js';

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmdbFixturesDir = join(__dirname, '..', 'tests', 'fixtures', 'tmdb');

function loadTmdbFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(tmdbFixturesDir, name), 'utf-8')) as Record<string, unknown>;
}

const tmdbFixtures = {
  trendingMovies: loadTmdbFixture('trending-movies.json'),
  trendingSeries: loadTmdbFixture('trending-series.json'),
  anticipatedMovies: loadTmdbFixture('anticipated-movies.json'),
  anticipatedSeries: loadTmdbFixture('anticipated-series.json'),
  searchMovies: loadTmdbFixture('search-movies.json'),
  searchSeries: loadTmdbFixture('search-series.json'),
  movieDetail302946: loadTmdbFixture('movie-detail-302946.json'),
  seriesDetail1396: loadTmdbFixture('series-detail-1396.json'),
  season1396S1: loadTmdbFixture('season-1396-1.json'),
};

type TmdbProxyParams = { tmdbPath?: string | string[] };

function normalizeTmdbPath(tmdbPath: string | string[] | undefined): string {
  if (Array.isArray(tmdbPath)) return tmdbPath.join('/');
  return tmdbPath ?? '';
}

function getTmdbFixtureResponse(pathname: string): { status: number; body: Record<string, unknown> } {
  if (pathname.startsWith('genre/')) return { status: 200, body: { genres: [] } };
  if (pathname.startsWith('trending/movie/')) return { status: 200, body: tmdbFixtures.trendingMovies };
  if (pathname.startsWith('trending/tv/')) return { status: 200, body: tmdbFixtures.trendingSeries };
  if (pathname.startsWith('discover/movie')) return { status: 200, body: tmdbFixtures.anticipatedMovies };
  if (pathname.startsWith('discover/tv')) return { status: 200, body: tmdbFixtures.anticipatedSeries };
  if (pathname.startsWith('search/movie')) return { status: 200, body: tmdbFixtures.searchMovies };
  if (pathname.startsWith('search/tv')) return { status: 200, body: tmdbFixtures.searchSeries };
  if (pathname.startsWith('tv/1396/season/1')) return { status: 200, body: tmdbFixtures.season1396S1 };
  if (pathname.startsWith('movie/302946')) return { status: 200, body: tmdbFixtures.movieDetail302946 };
  if (pathname.startsWith('tv/1396')) return { status: 200, body: tmdbFixtures.seriesDetail1396 };
  if (pathname.startsWith('watch/providers/')) return { status: 200, body: { results: [] } };
  if (pathname.startsWith('movie/') || pathname.startsWith('tv/')) {
    return { status: 404, body: { status_message: 'Not found' } };
  }
  return { status: 200, body: { results: [], page: 1, total_pages: 1, total_results: 0 } };
}

// ── Library REST API (identical to production server) ──────────────

app.get('/api/version', (_req, res) => {
  res.json({ version: getAppVersion() });
});

app.get('/api/tmdb{/*tmdbPath}', (req: Request<TmdbProxyParams>, res) => {
  const fixture = getTmdbFixtureResponse(normalizeTmdbPath(req.params.tmdbPath));
  res.status(fixture.status).json(fixture.body);
});

app.post('/api/tmdb-ratings', (req, res) => {
  const { items } = req.body as { items: { tmdbId: number; contentType: string }[] };
  const ratings: Record<string, number> = {};
  if (Array.isArray(items)) {
    for (const { tmdbId, contentType } of items) {
      const fixture = getTmdbFixtureResponse(`${contentType}/${tmdbId}`);
      const data = fixture.body;
      if (data?.vote_average != null) {
        ratings[`${contentType}-${tmdbId}`] = data.vote_average as number;
      }
    }
  }
  res.json({ ratings });
});

app.get('/api/library', (req, res) => {
  const { contentType, status } = req.query as { contentType?: string; status?: string };
  res.json(queries.getAllItems(contentType, status));
});

app.get('/api/library/export', (_req, res) => {
  res.json(queries.exportAll());
});

app.get('/api/library/:tmdbId/:type', (req, res) => {
  const item = queries.getItemByTmdb(Number(req.params.tmdbId), req.params.type);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(item);
});

app.post('/api/library', (req, res) => {
  const id = queries.addItem(req.body);
  res.json({ id });
});

app.patch('/api/library/:id', (req, res) => {
  queries.updateItem(Number(req.params.id), req.body);
  res.json({ ok: true });
});

app.delete('/api/library/:id', (req, res) => {
  queries.deleteItem(Number(req.params.id));
  res.json({ ok: true });
});

app.post('/api/library/clear', (_req, res) => {
  queries.clearAll();
  res.json({ ok: true });
});

// ── Progress & Episodes ────────────────────────────────────────────

app.get('/api/progress/:tmdbId', (req, res) => {
  const p = queries.getProgress(Number(req.params.tmdbId));
  res.json(p);
});

app.put('/api/progress', (req, res) => {
  queries.upsertProgress(req.body);
  res.json({ ok: true });
});

app.get('/api/episodes/:tmdbId/:season', (req, res) => {
  res.json(queries.getEpisodes(Number(req.params.tmdbId), Number(req.params.season)));
});

app.post('/api/episodes/toggle', (req, res) => {
  const { tmdbId, season, episode } = req.body;
  res.json(queries.toggleEpisode(tmdbId, season, episode));
});

app.post('/api/episodes/import', (req, res) => {
  const { entries } = req.body as { entries: { tmdbId: number; season: number; episode: number }[] };
  queries.bulkInsertEpisodes(entries ?? []);
  res.json({ ok: true });
});

app.post('/api/episodes/season', (req, res) => {
  const { tmdbId, season, episodes } = req.body;
  queries.markSeasonWatched(tmdbId, season, episodes);
  res.json({ ok: true });
});

// ── Settings ───────────────────────────────────────────────────────

app.get('/api/settings', (_req, res) => {
  res.json(queries.getSettings());
});

app.put('/api/settings', (req, res) => {
  queries.saveSettings(req.body);
  res.json({ ok: true });
});

app.get('/api/watch-links/:contentType/:tmdbId', (_req, res) => {
  res.json({ configured: true, cached: false, links: [] });
});

app.post('/api/migrate', (req, res) => {
  try {
    queries.migrate(req.body);
    res.json({ ok: true, message: 'Migration complete' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Stubbed Chat Endpoints ─────────────────────────────────────────

app.post('/api/chat/session', (_req, res) => {
  res.json({ sessionId: 'test-session-123' });
});

app.post('/api/chat/message', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'delta', content: 'This is a stubbed test response from the AI assistant.' })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});

app.delete('/api/chat/session/:id', (_req, res) => {
  res.json({ ok: true });
});

// ── Stubbed Recap Endpoint ─────────────────────────────────────────

app.post('/api/recap/episode', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const recap =
    "In this gripping episode, the tension reaches a breaking point as Walt makes a decision that will have far-reaching consequences. Jesse is forced to confront the reality of their situation while the walls close in around them. Meanwhile, Skyler grows increasingly suspicious of Walt's behavior, setting the stage for a dramatic confrontation.";
  res.write(`data: ${JSON.stringify({ type: 'delta', content: recap })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});

// ── Start ──────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server ready on http://localhost:${PORT}`);
  console.log(`DB: ${process.env.TEST_DB_PATH ?? 'data/movie-tracker.db'}`);
});
