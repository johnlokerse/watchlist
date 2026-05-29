# Agent Notes — Watchlist

## Dev commands

- `npm run dev` — starts **both** Vite (frontend) and Express backend concurrently. Backend runs on `tsx watch` with `.env` loaded.
- `npm run dev:server` — backend only (`tsx watch --env-file .env server/index.ts`).
- `npm run dev:server:test` — test backend with stubbed Copilot SDK (`--env-file .env.test`).
- `npm run build` — `tsc -b && vite build`. Uses TypeScript project references.
- `npm run lint` — `eslint .` (ignores `dist`).
- `npm run test` — Playwright E2E (headless). `test:ui` / `test:headed` for interactive.

## Environment

- `.env` is used for dev/runtime secrets. `GH_TOKEN` is required for the Copilot SDK chat feature; without it the server hard-exits on startup.
- Configure the TMDB v4 read token in the app Settings; it is not a build-time env var.
- `.env.test` sets `TEST_DB_PATH=:memory:` so Playwright uses an in-memory SQLite DB.

## Architecture

- `src/` — Vite + React 19 + TypeScript frontend. Entry `src/main.tsx`.
- `server/` — Express backend. `server/index.ts` is the production app; `server/test-server.ts` is the Copilot-stubbed version used by Playwright.
- `data/` — SQLite database file (`movie-tracker.db`). Auto-created on first run. Gitignored.
- Database: `better-sqlite3` with WAL mode enabled. Tables auto-created in `server/db.ts`.
- TypeScript: project references. `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`.

## Vite proxy

- `/api` → `http://localhost:3001` (Express backend).
- `/trakt-api` → `https://api.trakt.tv` (rewrite strips prefix).
- SSE responses disable Nagle's algorithm for low-latency streaming.

## Testing

- Playwright E2E only (`tests/`). No unit tests.
- `playwright.config.ts` auto-starts **two** webServers: the test Express backend (port 3001) and Vite dev server in `test` mode (port 5173).
- TMDB API calls are mocked via `page.route()` using JSON fixtures in `tests/fixtures/tmdb/`.
- Every mutation test should call `clearLibrary(request)` in `beforeEach`.
- Use `seedMovie(request)` / `seedSeries(request)` from `tests/helpers/seed.ts` to populate data.
- Use `setupTMDBMocks(page)` from `tests/helpers/mock-tmdb.ts` before `page.goto()` in any test that triggers TMDB fetches.

## Copilot SDK

- The Express server initializes a `CopilotClient` on boot and calls `client.start()`.
- If the GH CLI or `gh-copilot` extension is missing, the server logs an error and exits with code 1.
- Session data is persisted to `~/.copilot/watchlist-sessions` (override with `WATCHLIST_COPILOT_CONFIG_DIR`).
- Chat endpoints stream via SSE; episode recap is a separate one-off session using Claude Sonnet 4.6.

## Build / deploy

- `Dockerfile` is multi-stage: builder compiles native deps (`better-sqlite3`) and Vite assets; runtime stage installs `gh` CLI and starts the server with `tsx`.
- GHCR publishing is handled by `.github/workflows/docker-publish.yml` for `vX.Y.Z` tags only. It publishes `ghcr.io/johnlokerse/watchlist:X.Y.Z` and `latest` for linux/amd64 and linux/arm64.
- In production (`NODE_ENV=production`), Express serves the built frontend from `dist/` and falls back to `index.html` for SPA routing.

## Versioning

- After making changes, bump the version in **both** `package.json` (`"version"`) and `Dockerfile` (`ARG APP_VERSION`). Keep them in sync.
- Releases are triggered by pushing a `vX.Y.Z` tag matching the `package.json` version. The CI workflow passes the tag as `APP_VERSION` to the Docker build.
