# FlavFlix Showcase

FlavFlix Showcase is the public, interactive demonstration of my private FlavFlix project: a cinematic movie and TV hub built with Next.js, React, Tailwind CSS, TMDB, and OMDb.

**Live demonstration:** [flavflix-showcase.vercel.app](https://flavflix-showcase.vercel.app)

[![CI](https://github.com/im24a-gesztelyif/flavflix-showcase/actions/workflows/ci.yml/badge.svg)](https://github.com/im24a-gesztelyif/flavflix-showcase/actions/workflows/ci.yml)

> [!IMPORTANT]
> This repository is the portfolio showcase, not the complete private FlavFlix codebase. It runs without accounts or a cloud database, stores showcase data only in the visitor's browser, and limits playback of each movie or TV episode to five minutes.

## What you can demonstrate

- Browse movie and TV discovery rails backed by live TMDB metadata
- Search titles, people, and production companies
- Open movie, series, season, episode, collection, person, and company pages
- View OMDb rating enrichment when configured
- Create and manage up to four local profiles
- Save titles and maintain local watch history, progress, preferences, and continue-watching rows
- Open film and episode playback through embedded third-party sources
- Switch between available playback sources when necessary
- Explore redesigned title details, random picks, award filters, and upcoming releases
- Demonstrate intro skips and next-episode credits controls when third-party playback data is available
- Resume series at the next released, unwatched episode after completing an episode
- Use the responsive desktop and mobile interface

## The five-minute preview

Each movie or TV episode receives a maximum five-minute preview in this showcase.
The cumulative preview budget is stored per local profile and title/episode, survives page reloads and source switches, and removes the embedded player when exhausted. This is a browser-side demonstration limit, not a server-side access-control system. Clearing browser storage resets local showcase data.
This showcase is meant for demonstration purposes only.

## Disclaimer

> [!WARNING]
> **Playback and third-party content**
>
> FlavFlix does not host, upload, store, or distribute films or television content. Playback, availability, subtitles, and player behaviour are supplied entirely by independent third-party providers embedded by the application. Those services are not operated or controlled by this project.
>
> Movie and television metadata and images are supplied by TMDB, with optional ratings from OMDb. FlavFlix is a personal educational and portfolio demonstration and is not affiliated with Netflix, TMDB, OMDb, any playback provider, studio, broadcaster, or rights holder.

## Run the showcase locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your server-side metadata API credentials to `.env.local`:

| Variable | Purpose |
|---|---|
| `TMDB_READ_TOKEN` | Required TMDB read access token |
| `OMDB_API_KEY` | Optional OMDb ratings key |
| `NEXT_PUBLIC_TMDB_LANGUAGE` | Default metadata language |
| `NEXT_PUBLIC_TMDB_REGION` | Default regional setting |

No Supabase project, database, login, or account configuration is required. Profiles and application state use browser `localStorage` specifically for this public demonstration.

Skip timestamps combine SkipDB and TheIntroDB when available. Missing coverage or a service outage does not prevent playback; skipping controls depend on the embedded source's supported events.

## Development checks

```bash
npm test
npm run lint
npm run build
```

The tests include showcase-specific guardrails alongside skip-timestamp and series-resume checks. See [GitHub automatic updates](docs/github-auto-sync.md) for activation, and [showcase sync notes](docs/showcase-sync.md) for the upstream adaptation rules.
