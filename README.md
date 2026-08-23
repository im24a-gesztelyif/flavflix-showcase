# FlavFlix Showcase

A public learning showcase for a cinematic movie and TV discovery application built with Next.js, TMDB, OMDb, and Supabase.

> **Learning-project note:** This repository focuses on interface architecture, discovery, authentication, profiles, lists, history, and synchronized account state. Experimental third-party playback integrations from the private development project are intentionally excluded.

[![CI](https://github.com/im24a-gesztelyif/flavflix-showcase/actions/workflows/ci.yml/badge.svg)](https://github.com/im24a-gesztelyif/flavflix-showcase/actions/workflows/ci.yml)

![FlavFlix account interface](docs/screenshots/home.png)

## Implemented features

- Movie and TV discovery rails backed by TMDB
- Search across titles, people, and production companies
- Detailed title, season, episode, collection, person, and company views
- OMDb rating enrichment
- Supabase authentication and account-backed profiles
- Saved titles, history, progress records, preferences, and account deletion
- Responsive navigation, loading states, caching, and TMDB attribution
- Public showcase mode that intentionally disables playback

## Technology stack

- Next.js App Router and React
- Tailwind CSS
- Supabase authentication and PostgreSQL data
- TMDB and optional OMDb metadata APIs
- Zod-backed validation and server routes

## Architecture

- **Next.js App Router** for pages, layouts, loading states, and server routes
- **React** for reusable discovery, detail, account, and profile interfaces
- **Supabase** for authentication and relational account data
- **TMDB and OMDb** accessed through server-side proxy routes
- **Tailwind CSS** for the responsive visual system

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide the required API and Supabase values.

3. Apply the SQL files in `supabase/migrations` to a Supabase project.

4. Start the application:

   ```bash
   npm run dev
   ```

## Configuration

| Variable | Purpose |
|---|---|
| `TMDB_READ_TOKEN` | Server-side TMDB API access |
| `OMDB_API_KEY` | Optional OMDb ratings |
| `NEXT_PUBLIC_TMDB_LANGUAGE` | Default metadata language |
| `NEXT_PUBLIC_TMDB_REGION` | Default regional settings |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only administrative operations |

Never commit real credentials. The checked-in `.env.example` contains placeholders only.

## Verification

```bash
npm run lint
npm run build
```

## Limitations and next steps

- Playback is disabled in this public repository.
- A time-limited demonstration may be linked later, after it is independently reviewed.
- The application requires external TMDB and Supabase configuration to run with live data.

## Project context

FlavFlix is a personal learning project used to practise full-stack React development, external API integration, authentication, relational data, state synchronization, responsive interface design, and project documentation. It is not affiliated with Netflix, TMDB, OMDb, or any film studio.

## Learning outcomes

The project developed my understanding of server/client boundaries in Next.js, secure API proxying, authentication flows, relational account data, caching, and maintaining a larger component-based interface.
