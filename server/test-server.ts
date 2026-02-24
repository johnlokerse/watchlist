/**
 * Test server — same REST API as server/index.ts but with:
 * - No real CopilotClient (stubbed chat endpoints)
 * - In-memory SQLite via TEST_DB_PATH=:memory: from .env.test
 *
 * Used exclusively by Playwright tests via playwright.config.ts webServer.
 */
import express from 'express';
import cors from 'cors';
import { queries } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// ── Library REST API (identical to production server) ──────────────

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

// ── Start ──────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server ready on http://localhost:${PORT}`);
  console.log(`DB: ${process.env.TEST_DB_PATH ?? 'data/movie-tracker.db'}`);
});
