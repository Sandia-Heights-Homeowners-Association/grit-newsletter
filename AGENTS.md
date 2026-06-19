# AGENTS.md

Guidance for coding agents working on this repository.

## Project Summary

This is The GRIT newsletter submission and editor system for the Sandia Heights Homeowners Association. It is a Next.js 16 App Router app using React 19, TypeScript, Tailwind CSS 4, Neon Postgres, Cloudflare Turnstile, Resend, dnd-kit, and Tiptap packages.

The normal live data path is Neon Postgres through `lib/db.ts` and `lib/store.ts`. Local JSON is used for export/backup helpers only.

## First Things To Check

- Run `git status --short` before editing. This repo may contain user changes; do not revert them.
- Prefer `rg` and `rg --files` for searching.
- Read `README.md`, `package.json`, `lib/db.ts`, `lib/store.ts`, `lib/types.ts`, and the relevant route/page before making behavioral changes.
- Treat comments or docs mentioning Vercel Blob or file-based live storage as legacy unless the current source code proves otherwise.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

There is no configured test script at the moment. Use `npm run lint` and `npm run build` as the main verification commands when appropriate.

## Environment

Local development needs `.env.local`. Do not commit secrets.

Important variables:

- `DATABASE_URL` for Neon Postgres
- `EDITOR_PASSWORD` for `/editor` and editor APIs
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` for production CAPTCHA
- `RESEND_API_KEY`, `EDITOR_EMAIL`, `EDITOR_EMAIL_BCC`, and `NEXT_PUBLIC_SITE_URL` for email behavior

If `TURNSTILE_SECRET_KEY` is absent in development, server verification is skipped, but client forms still expect a CAPTCHA token.

## Data And Domain Rules

- The `submissions.month` value records the original target issue/collection period and should remain immutable.
- `submission.disposition` may be empty/undefined, `backlog`, `archived`, or a `YYYY-MM` month string meaning accepted for that issue.
- Keep category lists in `lib/types.ts`.
- Keep deadline/month calculations in `lib/constants.ts` and persistence access in `lib/store.ts`.
- `lib/db.ts` lazily creates the `submissions`, `config`, `captions`, and `caption_image` tables.
- Caption contest images are stored as resized data URLs/text in the database, not as public files.

## Editing Guidance

- Keep changes scoped. Avoid unrelated refactors or broad UI rewrites.
- Do not edit `.env.local`, `.next/`, `node_modules/`, generated TypeScript build info, or local backup data unless explicitly asked.
- The `scripts/` folder contains historical local migration/debug utilities, many from a Vercel Blob era. Do not assume they are part of the current app workflow.
- Use `apply_patch` for manual edits.
- Preserve existing TypeScript strictness and the `@/*` path alias.
- For public form changes, check both the page component and `app/api/submit/route.ts`.
- For editor workflow changes, check `app/editor/page.tsx`, `app/components/ContentFlow.tsx`, `app/api/editor/route.ts`, `lib/store.ts`, and `lib/db.ts`.

## UI Notes

- The app uses Tailwind utility classes directly.
- Keep the current warm GRIT visual language unless the user asks for a redesign.
- Public pages include submission guidelines and terms; avoid hiding operationally important text behind undocumented controls.
- Editor features include disposition management, backlog/archive views, data export, bulk deletion, content ordering, preview/export, deadline settings, and caption contest management.

## Verification

For documentation-only changes, review the files and run `git diff`.

For code changes, prefer:

```bash
npm run lint
npm run build
```

If a command cannot run because required services or credentials are missing, report that clearly and explain what was verified instead.
