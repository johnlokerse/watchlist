import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CopilotClient } from '@github/copilot-sdk';
import { tmdbTools } from './tools.js';
import { queries } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// ── Library REST API ──────────────────────────────────────────────

// GET /api/library — list items (optional ?contentType=&status=)
app.get('/api/library', (req, res) => {
  const { contentType, status } = req.query as { contentType?: string; status?: string };
  res.json(queries.getAllItems(contentType, status));
});

// GET /api/library/:tmdbId/:type — single item lookup
app.get('/api/library/:tmdbId/:type', (req, res) => {
  const item = queries.getItemByTmdb(Number(req.params.tmdbId), req.params.type);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(item);
});

// POST /api/library — add item (skips if already exists)
app.post('/api/library', (req, res) => {
  const id = queries.addItem(req.body);
  res.json({ id });
});

// PATCH /api/library/:id — update item fields
app.patch('/api/library/:id', (req, res) => {
  queries.updateItem(Number(req.params.id), req.body);
  res.json({ ok: true });
});

// DELETE /api/library/:id — remove item + series progress
app.delete('/api/library/:id', (req, res) => {
  queries.deleteItem(Number(req.params.id));
  res.json({ ok: true });
});

// GET /api/progress/:tmdbId — series progress
app.get('/api/progress/:tmdbId', (req, res) => {
  const p = queries.getProgress(Number(req.params.tmdbId));
  res.json(p);
});

// PUT /api/progress — upsert series progress
app.put('/api/progress', (req, res) => {
  queries.upsertProgress(req.body);
  res.json({ ok: true });
});

// GET /api/episodes/:tmdbId/:season — watched episodes for a season
app.get('/api/episodes/:tmdbId/:season', (req, res) => {
  res.json(queries.getEpisodes(Number(req.params.tmdbId), Number(req.params.season)));
});

// POST /api/episodes/toggle — toggle a single episode
app.post('/api/episodes/toggle', (req, res) => {
  const { tmdbId, season, episode } = req.body;
  res.json(queries.toggleEpisode(tmdbId, season, episode));
});

// POST /api/episodes/import — bulk INSERT OR IGNORE, used by JSON import
app.post('/api/episodes/import', (req, res) => {
  const { entries } = req.body as { entries: { tmdbId: number; season: number; episode: number }[] };
  queries.bulkInsertEpisodes(entries ?? []);
  res.json({ ok: true });
});

// POST /api/episodes/season — mark entire season watched
app.post('/api/episodes/season', (req, res) => {
  const { tmdbId, season, episodes } = req.body;
  queries.markSeasonWatched(tmdbId, season, episodes);
  res.json({ ok: true });
});

// POST /api/migrate — one-time Dexie import
app.post('/api/migrate', (req, res) => {
  try {
    queries.migrate(req.body);
    res.json({ ok: true, message: 'Migration complete' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/library/clear — clear all data
app.post('/api/library/clear', (_req, res) => {
  queries.clearAll();
  res.json({ ok: true });
});

// GET /api/library/export — export library
app.get('/api/library/export', (_req, res) => {
  res.json(queries.exportAll());
});

// GET /api/settings — get all settings
app.get('/api/settings', (_req, res) => {
  res.json(queries.getSettings());
});

// PUT /api/settings — save all settings
app.put('/api/settings', (req, res) => {
  queries.saveSettings(req.body);
  res.json({ ok: true });
});

const client = new CopilotClient();

try {
  await client.start();
  console.log('✓ Copilot SDK client started');
  const models = await client.listModels();
  console.log('Available models:', models.map((m: { id: string }) => m.id).join(', '));
} catch (err) {
  console.error('✗ Failed to start Copilot SDK — is the Copilot CLI installed?', err);
  process.exit(1);
}

type ActiveSession = Awaited<ReturnType<typeof client.createSession>>;
const sessions = new Map<string, ActiveSession>();

interface LibraryItem {
  title: string;
  contentType: string;
  status: string;
  userRating: number | null;
}

function buildLibraryContext(library: LibraryItem[]): string {
  if (!library.length) return 'The user has no items in their library yet.';

  const watched = library.filter((i) => i.status === 'watched');
  const watching = library.filter((i) => i.status === 'watching');
  const planned = library.filter((i) => i.status === 'plan_to_watch');
  const dropped = library.filter((i) => i.status === 'dropped');

  const fmt = (item: LibraryItem) =>
    `  - "${item.title}" (${item.contentType})${item.userRating ? ` ★${item.userRating}/10` : ''}`;

  const sections: string[] = [];
  if (watched.length) sections.push(`Watched (${watched.length}):\n${watched.map(fmt).join('\n')}`);
  if (watching.length) sections.push(`Currently watching (${watching.length}):\n${watching.map(fmt).join('\n')}`);
  if (planned.length) sections.push(`Plan to watch (${planned.length}):\n${planned.map(fmt).join('\n')}`);
  if (dropped.length) sections.push(`Dropped (${dropped.length}):\n${dropped.map(fmt).join('\n')}`);

  return sections.join('\n\n');
}

// POST /api/chat/session — create a new Copilot session with library context
app.post('/api/chat/session', async (req, res) => {
  try {
    // Read library from SQLite — cast needed because SQLite stores dates as ISO strings
    const library = queries.getAllItems();

    const session = await client.createSession({
      model: 'claude-sonnet-4.6',
      streaming: true,
      tools: tmdbTools,
      systemMessage: {
        content: `You are a friendly movie and TV series recommendation assistant embedded in the user's personal watchlist app.

You have full access to the user's personal library below. Use it to give **personalized** recommendations — not generic ones.

${buildLibraryContext(library)}

Guidelines:
- Be conversational, concise, and enthusiastic about movies/TV.
- Always cross-reference the user's library before suggesting something they've already seen.
- CRITICAL: Your training data may be outdated. For ANY factual question about movies or series (sequels, release dates, cast, upcoming titles, franchise info), ALWAYS use searchTMDB first to get current, real-time data from TMDB. Never rely solely on your training data for factual claims.
- When the user asks about sequels, prequels, successors, or related movies in a franchise, use searchTMDB to find the title, then getTMDBDetails for full info, then getSimilar or getRecommendations to find related titles in the franchise.
- IMPORTANT: For every movie or series you suggest, you MUST first use searchTMDB to find its TMDB ID, then format the title as a markdown link using this exact pattern: [Title](add:movie/TMDB_ID) for movies or [Title](add:tv/TMDB_ID) for TV series. Always include the TMDB ID in the link — never suggest a title without this link format.
- Format suggestions as short lists: linked title, one-sentence pitch, and why it matches their taste.
- If the user asks about a specific upcoming title, search for it on TMDB first to get its ID, then use getSimilar/getRecommendations.`,
      },
    });

    sessions.set(session.sessionId, session);
    res.json({ sessionId: session.sessionId });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/chat/message — send message, stream response via SSE
app.post('/api/chat/message', async (req, res) => {
  const { sessionId, message } = req.body as { sessionId: string; message: string };
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Disable Nagle's algorithm so each res.write() is sent immediately as its own TCP packet
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Subscribe to delta events for real streaming
  let accumulated = '';
  let deltaCount = 0;
  const unsubDelta = session.on('assistant.message_delta', (event) => {
    const content = event.data.deltaContent;
    if (content) {
      deltaCount++;
      if (deltaCount === 1) console.log(`[chat] streaming started (first delta: "${content.substring(0, 30)}")`);
      accumulated += content;
      send({ type: 'delta', content });
    }
  });

  req.on('close', () => { unsubDelta(); });

  try {
    // sendAndWait is reliable; delta events above provide streaming if supported
    const result = await session.sendAndWait({ prompt: message }, 90_000);

    // If no deltas arrived, simulate streaming word-by-word so the chat doesn't pop in all at once
    if (!accumulated) {
      console.log('[chat] no delta events received — falling back to word-by-word streaming');
      const content = result?.data?.content ?? 'No response received.';
      const words = content.split(/(\s+)/);
      for (const word of words) {
        if (word) {
          send({ type: 'delta', content: word });
          await new Promise<void>((resolve) => setTimeout(resolve, 20));
        }
      }
    } else {
      console.log(`[chat] streaming complete (${deltaCount} delta events)`);
    }

    send({ type: 'done' });
  } catch (err) {
    console.error('sendAndWait error:', err);
    send({ type: 'error', message: String(err) });
    send({ type: 'done' });
  } finally {
    unsubDelta();
    res.end();
  }
});

// DELETE /api/chat/session/:id — clean up session
app.delete('/api/chat/session/:id', async (req, res) => {
  const session = sessions.get(req.params.id);
  if (session) {
    await session.destroy().catch(() => {});
    sessions.delete(req.params.id);
  }
  res.json({ ok: true });
});

const PORT = 3001;

// In production, serve the built Vite frontend from dist/
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Chat server ready on http://localhost:${PORT}`);
  console.log(`TMDB token: ${process.env.VITE_TMDB_API_TOKEN ? '✓ loaded' : '✗ missing (set VITE_TMDB_API_TOKEN in .env)'}`);
});
