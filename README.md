# The GRIT Newsletter System

The GRIT is a Next.js application for collecting, reviewing, organizing, and exporting newsletter content for the Sandia Heights Homeowners Association.

It provides a public unified submission form for neighbors and committee authors, a routine form for regular operational content, and an editor dashboard for newsletter assembly.

## Features

- Public dashboard with current and previous issue submission counts
- Unified community and committee submission form with topic selection that defaults to general/other
- Routine submission form for recurring operational content such as ACC, CSC, and Security logs
- Cloudflare Turnstile CAPTCHA on public submission flows
- Neon Postgres persistence for submissions, editor settings, and caption contest data
- Resend email confirmations for submitters when email is configured
- Editor dashboard for reviewing submissions, assigning dispositions, editing entries, ordering content, exporting newsletter text, and exporting all data
- Quick editor-created reminder/placeholders that appear in issue preview/export until resolved
- Optional caption contest with editor-managed image, title, description, entries, and public submission page
- Database-backed JSON export from the editor dashboard

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Neon serverless Postgres
- Cloudflare Turnstile
- Resend
- dnd-kit for editor content ordering
- Tiptap packages for rich text/editor support
- Docker for optional self-hosted deployment

## Requirements

- Node.js compatible with Next.js 16
- npm
- A Neon Postgres database URL for normal app operation
- Docker and Docker Compose for container deployment

The app initializes required database tables lazily on first use through `lib/db.ts`.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set at least:

```bash
DATABASE_URL="postgresql://..."
EDITOR_PASSWORD="..."
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string. The app throws if this is missing when database-backed routes run. |
| `EDITOR_PASSWORD` | Yes for editor | Password used by `/editor` and protected editor APIs. |
| `TURNSTILE_SITE_KEY` | Production | Public Cloudflare Turnstile site key served through `/api/public-config`. A test key is used as a local fallback. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional | Backward-compatible public Turnstile key name. Prefer `TURNSTILE_SITE_KEY` for container runtime config. |
| `TURNSTILE_SECRET_KEY` | Production | Server-side Cloudflare Turnstile secret. In development, the API skips verification if this is absent, but forms still need a CAPTCHA token. |
| `RESEND_API_KEY` | Optional | Enables confirmation emails. Missing key skips email sends. |
| `EDITOR_EMAIL` | Optional | Primary recipient for editor notifications if notification sending is used. |
| `EDITOR_EMAIL_BCC` | Optional | BCC address listed in environment examples. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public site URL used in generated email links. Include the protocol, for example `https://sandiaheightsgrit.app`. |

Do not commit `.env.local` or real credentials.

### Environment File Rules

- `.env.example` is the committed local development template.
- `.env.local` is the ignored local development file used by `npm run dev`.
- `.env.production.example` is the committed Docker/DigitalOcean template.
- `.env.production` is the ignored production runtime file used by Docker Compose because `docker-compose.yml` lists it under `env_file`.
- Do not commit real database URLs, API keys, editor passwords, Vercel tokens, or production `.env` files.
- `TURNSTILE_SITE_KEY` is the canonical public Turnstile key. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is only a temporary compatibility fallback.

## Available Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:view
```

There is currently no test script in `package.json`.

## Viewing Database Contents

For quick read-only inspection from a terminal, use:

```bash
npm run db:view
npm run db:view -- submissions --limit 25 --status backlog
npm run db:view -- submissions --month 2026-07 --search wildlife
npm run db:view -- submission <submission-id>
npm run db:view -- captions
npm run db:view -- schema
```

The viewer loads `DATABASE_URL` from `.env.local` or the current shell environment and never prints the database URL.

## Main Routes

- `/` - public dashboard, unified contribution form, stats, guidelines, terms, and caption contest callout when enabled
- `/submit/[category]` and category-specific `/submit/...` pages - public community contribution forms
- `/routine` - routine newsletter content submission form
- `/caption` - public caption contest entry form when the contest is enabled
- `/editor` - editor dashboard, protected by `EDITOR_PASSWORD`

## API Routes

- `POST /api/submit` - validates CAPTCHA, stores a submission, and sends a submitter confirmation when possible
- `GET /api/stats` - returns current and previous collection-period stats
- `GET /api/caption` - returns public caption contest state and image when enabled
- `POST /api/caption` - validates CAPTCHA and stores a caption contest entry
- `GET /api/health` - lightweight container health check
- `GET /api/public-config` - exposes non-secret browser runtime configuration such as the Turnstile site key
- `GET /api/editor` - returns editor dashboard data after bearer-password validation
- `POST /api/editor` - handles editor actions such as disposition updates, exports, deadline settings, caption contest management, and deletion
- `GET /api/backup?action=export` - exports database-backed submissions as JSON after editor authentication

## Data Model

The live source of truth is Neon Postgres.

`lib/db.ts` creates these tables when needed:

- `submissions` - newsletter submissions
- `config` - settings such as the deadline day and caption contest configuration
- `captions` - caption contest entries
- `caption_image` - the current caption contest image as text plus image type

New submissions store private contact fields separately from newsletter copy:

- `contact_name`
- `contact_email`
- `location`
- `title`
- `item_type`, currently `submission` or `placeholder`
- `priority`, `editor_notes`, and `needs_attention`

Submission dispositions use the current newer model:

- `undefined` or empty - unreviewed
- `YYYY-MM` - accepted for a specific issue month
- `backlog` - saved for later
- `archived` - not currently used

The `month` field records the original collection period and should be treated as immutable.

## Backups and Exports

The editor dashboard can export all database-backed submissions as JSON and export accepted newsletter content as text.

The editor dashboard can export all database-backed submissions as JSON. Live app reads and writes go through Postgres.

## Project Structure

```text
app/
  api/                 Route handlers for submissions, stats, editor, backup, captions
  caption/             Public caption contest page
  components/          Shared UI components
  editor/              Editor dashboard
  routine/             Routine content submission form
  submit/              Community submission forms
lib/
  backup.ts            Database export helper
  constants.ts         App labels, editor password, month/deadline helpers
  db.ts                Neon schema and query helpers
  email.ts             Resend email helpers
  store.ts             Application-level data operations
  types.ts             Categories and submission types
public/
  logo.png             Primary GRIT logo
```

## Development Notes

- Use the `@/*` import alias for project-root imports.
- Keep category changes centralized in `lib/types.ts`.
- Keep month/deadline logic centralized in `lib/constants.ts` and `lib/store.ts`.
- Editor authentication is simple bearer-password checking, not a full session/auth provider.
- Public submission flows are protected by CAPTCHA rather than password-gated pages.
- Historical file-storage migration notes have been removed; current app storage is Postgres-backed.

## Deployment

For production, configure the same environment variables in the hosting environment:

- `DATABASE_URL`
- `EDITOR_PASSWORD`
- Turnstile site and secret keys
- Resend settings if email confirmations should be sent
- `NEXT_PUBLIC_SITE_URL` with `https://`

`next build` and `next start` follow Next.js production-mode environment loading. In the standalone Docker deployment, the container receives runtime values from Compose rather than from committed files.

### DigitalOcean Docker Deployment

The app can run on a DigitalOcean droplet as a standalone Next.js container:

```bash
cp .env.production.example .env.production
docker compose up -d --build
curl http://127.0.0.1:3000/api/health
```

The Compose file binds the app to `127.0.0.1:3000` so a host-level reverse proxy can terminate HTTPS. See [DEPLOYMENT.md](DEPLOYMENT.md) and [deploy/Caddyfile](deploy/Caddyfile).

The current live path does not require Vercel services. Neon can remain the database while the web app moves to DigitalOcean; moving Postgres onto the droplet can be handled later as a separate data migration.

The Docker image should remain secret-free. Keep `.env.production` on the server, or inject the same variables through your deployment system. Resend remains the recommended outbound email provider for now because it is already integrated and simpler than Microsoft Graph OAuth for transactional confirmations.

## License

This project is proprietary to the Sandia Heights Homeowners Association.
