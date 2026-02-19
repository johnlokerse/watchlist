# 🎬 Watchlist — Movie & Series Tracker

A responsive React web app to track movies and series you've watched, discover upcoming releases with countdown timers, and find where to watch content.

## Features

- **Upcoming** — Browse upcoming movies & series with live "X days" countdown badges
- **Library** — Track your watched/watching/plan-to-watch movies & series with ratings, notes, and series progress
- **Discover** — Trending movies & series from TMDB
- **Detail Pages** — Rich metadata: poster, backdrop, overview, cast & crew, where to watch (streaming/rent/buy)
- **Search** — Search TMDB from the library page to find and add new content
- **Responsive** — Mobile-first design with bottom nav on mobile, top nav on desktop

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- TanStack Query (React Query)
- React Router v7
- Dexie.js (IndexedDB) for local persistence

## Getting Started

```bash
# 1. Get a TMDB API key:
#    - Sign up at https://www.themoviedb.org/signup
#    - Go to Settings → API → Create → Developer
#    - Copy the "API Read Access Token" (v4 bearer token)

# 2. Create .env file:
cp .env.example .env
# Edit .env and paste your token

# 3. Install & run:
npm install
npm run dev
```

## Project Structure

```
src/
├── api/          # TMDB API client + React Query hooks
├── db/           # Dexie.js database, models, hooks
├── components/
│   ├── layout/   # AppShell (top/bottom nav)
│   ├── ui/       # Card, CardGrid, SearchBar, Filters, etc.
│   └── detail/   # HeroBanner, Overview, CastCrew, WatchProviders
├── pages/        # Route-level pages
├── hooks/        # useCountdown, useDebounce, useSettings
└── utils/        # Date helpers, image URL builders, constants
```
