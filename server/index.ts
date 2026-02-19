import express from 'express';
import cors from 'cors';
import { CopilotClient } from '@github/copilot-sdk';
import { tmdbTools } from './tools.js';
import type { WatchedItem } from '../src/db/models.js';

const app = express();
app.use(cors());
app.use(express.json());

const client = new CopilotClient();

try {
  await client.start();
  console.log('✓ Copilot SDK client started');
} catch (err) {
  console.error('✗ Failed to start Copilot SDK — is the Copilot CLI installed?', err);
  process.exit(1);
}

type ActiveSession = Awaited<ReturnType<typeof client.createSession>>;
const sessions = new Map<string, ActiveSession>();

function buildLibraryContext(library: WatchedItem[]): string {
  if (!library.length) return 'The user has no items in their library yet.';

  const watched = library.filter((i) => i.status === 'watched');
  const watching = library.filter((i) => i.status === 'watching');
  const planned = library.filter((i) => i.status === 'plan_to_watch');
  const dropped = library.filter((i) => i.status === 'dropped');

  const fmt = (item: WatchedItem) =>
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
    const library: WatchedItem[] = req.body.library ?? [];

    const session = await client.createSession({
      model: 'gpt-4.1',
      streaming: true,
      tools: tmdbTools,
      systemMessage: {
        content: `You are a friendly movie and TV series recommendation assistant embedded in the user's personal watchlist app.

You have full access to the user's personal library below. Use it to give **personalized** recommendations — not generic ones.

${buildLibraryContext(library)}

Guidelines:
- Be conversational, concise, and enthusiastic about movies/TV.
- Always cross-reference the user's library before suggesting something they've already seen.
- When relevant, use the TMDB tools to look up details, similar titles, or recommendations.
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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Subscribe to delta events for real streaming
  let accumulated = '';
  const unsubDelta = session.on('assistant.message_delta', (event) => {
    const content = event.data.deltaContent;
    if (content) {
      accumulated += content;
      send({ type: 'delta', content });
    }
  });

  req.on('close', () => { unsubDelta(); });

  try {
    // sendAndWait is reliable; delta events above provide streaming if supported
    const result = await session.sendAndWait({ prompt: message }, 90_000);

    // If no deltas arrived, send the full response at once
    if (!accumulated) {
      const content = result?.data?.content ?? 'No response received.';
      send({ type: 'delta', content });
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
app.listen(PORT, () => {
  console.log(`Chat server ready on http://localhost:${PORT}`);
  console.log(`TMDB token: ${process.env.VITE_TMDB_API_TOKEN ? '✓ loaded' : '✗ missing (set VITE_TMDB_API_TOKEN in .env)'}`);
});
