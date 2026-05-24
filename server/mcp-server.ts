import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { Router, type Request, type Response } from 'express';
import { queries } from './db.js';
import { isTmdbTokenMissingError, tmdbFetchJson } from './tmdb.js';

function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'movie-tracker-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.tool('search_library',
    'Search movies/series in the local library by title or filter by contentType and status',
    {
      query: z.string().optional().describe('Optional search query for title'),
      contentType: z.string().optional().describe('Filter by type: movie or series'),
      status: z.string().optional().describe('Filter by status: watched, watching, plan_to_watch, or dropped'),
    },
    async (args) => {
      let items = queries.getAllItems(args.contentType, args.status);
      if (args.query) {
        const q = args.query.toLowerCase();
        items = items.filter((i) => i.title.toLowerCase().includes(q));
      }
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    },
  );

  server.tool('get_library_stats',
    'Get statistics about the library — total count, distribution by status and contentType, average rating',
    async () => {
      const all = queries.getAllItems();
      const total = all.length;
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let ratingSum = 0;
      let ratingCount = 0;
      for (const item of all) {
        byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
        byType[item.contentType] = (byType[item.contentType] ?? 0) + 1;
        if (item.userRating != null) {
          ratingSum += item.userRating;
          ratingCount++;
        }
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total, byStatus, byType,
            averageRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
            ratedCount: ratingCount,
          }, null, 2),
        }],
      };
    },
  );

  server.tool('get_watchlist',
    'Get all items with status plan_to_watch — your personal watchlist',
    async () => {
      const items = queries.getAllItems(undefined, 'plan_to_watch');
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    },
  );

  server.tool('get_series_progress',
    'Get series progress with watched episodes for a specific series by TMDB ID',
    {
      tmdbId: z.number().describe('TMDB ID of the series'),
    },
    async (args) => {
      const progress = queries.getProgress(args.tmdbId);
      const episodes = progress
        ? queries.getEpisodes(args.tmdbId, (progress as { currentSeason?: number }).currentSeason ?? 0)
        : [];
      return { content: [{ type: 'text', text: JSON.stringify({ progress, watchedEpisodes: episodes }, null, 2) }] };
    },
  );

  server.tool('add_to_library',
    'Add a movie or series to the library',
    {
      tmdbId: z.number().describe('TMDB ID'),
      contentType: z.string().describe('movie or series'),
      title: z.string(),
      posterPath: z.string().optional(),
      releaseDate: z.string().optional(),
      status: z.string().describe('watched, watching, plan_to_watch, or dropped'),
      userRating: z.number().optional(),
      notes: z.string().optional(),
      genreIds: z.array(z.number()).optional(),
    },
    async (args) => {
      const id = queries.addItem({
        tmdbId: args.tmdbId, contentType: args.contentType, title: args.title,
        posterPath: args.posterPath, releaseDate: args.releaseDate, status: args.status,
        userRating: args.userRating, notes: args.notes, genreIds: args.genreIds,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ id, message: `Added "${args.title}" to library` }, null, 2),
        }],
      };
    },
  );

  server.tool('update_rating',
    'Update the rating or notes for an item in the library by its database ID',
    {
      id: z.number().describe('Database ID of the item'),
      userRating: z.number().min(1).max(10).optional().describe('Rating 1-10'),
      notes: z.string().optional().describe('Personal notes'),
    },
    async (args) => {
      const changes: Record<string, unknown> = {};
      if (args.userRating !== undefined) changes.userRating = args.userRating;
      if (args.notes !== undefined) changes.notes = args.notes;
      queries.updateItem(args.id, changes);
      return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
    },
  );

  server.tool('toggle_episode',
    'Toggle a watched episode for a series (mark as watched/unwatched)',
    {
      tmdbId: z.number().describe('TMDB ID of the series'),
      season: z.number(),
      episode: z.number(),
    },
    async (args) => {
      const result = queries.toggleEpisode(args.tmdbId, args.season, args.episode);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  );

  server.tool('get_item_details',
    'Get full details for a library item — combines DB info with TMDB details (genres, cast, overview, runtime)',
    {
      tmdbId: z.number(),
      contentType: z.string().describe('movie or series'),
    },
    async (args) => {
      const item = queries.getItemByTmdb(args.tmdbId, args.contentType);
      let tmdbData: Record<string, unknown> | null = null;
      try {
        const mediaType = args.contentType === 'movie' ? 'movie' : 'tv';
        tmdbData = await tmdbFetchJson(
          `/${mediaType}/${args.tmdbId}`,
          { append_to_response: 'credits' },
        );
      } catch (err) {
        if (isTmdbTokenMissingError(err)) throw err;
        // TMDB fetch failed; return just DB info
      }
      return { content: [{ type: 'text', text: JSON.stringify({ library: item, tmdb: tmdbData }, null, 2) }] };
    },
  );

  // ── search_actor_library ──────────────────────────────────────────
  server.tool('search_actor_library',
    'Search for an actor/actress by name, get their movie and TV credits from TMDB, and cross-reference which titles are already in your personal library. Returns credits matched against your library items by tmdbId.',
    {
      name: z.string().describe('Full or partial name of the actor/actress'),
      type: z.string().optional().describe('Filter: movie, tv, or both (default: both)'),
    },
    async (args) => {
    // Step 1: Search for the person
    const searchResult = await tmdbFetchJson('/search/person', { query: args.name, page: '1' });
    const people = (searchResult.results as Record<string, unknown>[]).slice(0, 3);

    if (people.length === 0) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'No person found', results: [] }, null, 2) }] };
    }

    // Step 2: Get credits for each matched person
    const personId = people[0].id as number;
    const personName = people[0].name as string;

    const movieCredits: Record<string, unknown>[] = [];
    const tvCredits: Record<string, unknown>[] = [];

    if (args.type === 'movie' || args.type === 'both' || !args.type) {
      const movieData = await tmdbFetchJson(`/person/${personId}/movie_credits`);
      const cast = (movieData.cast as Record<string, unknown>[])
        .filter((c) => c.release_date)
        .sort((a, b) => String(b.release_date).localeCompare(String(a.release_date)));
      movieCredits.push(...cast.slice(0, 20));
    }

    if (args.type === 'tv' || args.type === 'both' || !args.type) {
      const tvData = await tmdbFetchJson(`/person/${personId}/tv_credits`);
      const cast = (tvData.cast as Record<string, unknown>[])
        .filter((c) => c.first_air_date)
        .sort((a, b) => String(b.first_air_date).localeCompare(String(a.first_air_date)));
      tvCredits.push(...cast.slice(0, 20));
    }

    // Step 3: Build a set of all unique tmdbIds from library
    const allItems = queries.getAllItems();
    const libraryByTmdb = new Map<number, { title: string; contentType: string; status: string; userRating: number | null }>();
    for (const item of allItems) {
      libraryByTmdb.set(item.tmdbId, {
        title: item.title,
        contentType: item.contentType,
        status: item.status,
        userRating: item.userRating,
      });
    }

    // Step 4: Annotate credits with library status
    const annotate = (credit: Record<string, unknown>, mediaType: string) => {
      const tmdbId = credit.id as number;
      const title = (credit.title ?? credit.name) as string;
      const year = ((credit.release_date ?? credit.first_air_date) as string)?.substring(0, 4);
      const lib = libraryByTmdb.get(tmdbId);
      return {
        tmdbId,
        title,
        year,
        mediaType,
        character: credit.character as string | undefined,
        inLibrary: !!lib,
        libraryStatus: lib?.status ?? null,
        libraryRating: lib?.userRating ?? null,
      };
    };

    const movies = movieCredits.map((c) => annotate(c, 'movie'));
    const tv = tvCredits.map((c) => annotate(c, 'tv'));
    const all = [...movies, ...tv].sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          person: { id: personId, name: personName },
          totalCredits: all.length,
          inLibrary: all.filter((c) => c.inLibrary).length,
          libraryMatch: all.filter((c) => c.inLibrary),
          otherCredits: all.filter((c) => !c.inLibrary),
        }, null, 2),
      }],
    };
  });

  return server;
}

interface SessionState {
  server: McpServer;
  transport: SSEServerTransport;
}

export function createMcpRouter(): Router {
  const router = Router();
  const sessions = new Map<string, SessionState>();

  router.get('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = new SSEServerTransport('/mcp/messages', res);
      const server = createMcpServer();
      const state: SessionState = { server, transport };
      sessions.set(transport.sessionId, state);
      res.on('close', () => {
        sessions.delete(transport.sessionId);
        server.close().catch(() => {});
      });
      await server.connect(transport);
    } catch (err) {
      console.error('MCP SSE connection error:', err);
      if (!res.headersSent) res.status(500).end();
    }
  });

  router.post('/mcp/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId query parameter required' });
      return;
    }
    const state = sessions.get(sessionId);
    if (!state) {
      res.status(404).json({ error: 'MCP session not found' });
      return;
    }
    try {
      await state.transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      console.error('MCP message handling error:', err);
      if (!res.headersSent) res.status(500).end();
    }
  });

  return router;
}
