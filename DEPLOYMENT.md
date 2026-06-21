# DigitalOcean Container Deployment

This app can run as a standalone Next.js server in Docker on a DigitalOcean droplet.

## Server Setup

Install Docker and the Compose plugin on the droplet, then clone the repository.

Create the production environment file:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with the real database URL, editor password, Turnstile keys, Resend key, and public site URL.

`docker-compose.yml` requires `.env.production` through `env_file`. If this file is missing, Compose stops before the app starts. This is separate from Next.js automatic `.env*` loading.

## Build And Run

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/api/health
```

The Compose file binds the app to `127.0.0.1:3000` so it is not directly exposed to the public internet. Put Caddy, nginx, or another reverse proxy in front of it for HTTPS.

## Caddy

An example Caddy config lives at `deploy/Caddyfile`.

Update the domain, then install or reload Caddy on the droplet:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Updating The App

```bash
git pull
docker compose up -d --build
docker image prune -f
```

## Data

The current live data source is Postgres through `DATABASE_URL`. Neon can remain the database while the app moves off Vercel. If you later move Postgres onto the droplet, use a Docker volume or managed backup process before switching `DATABASE_URL`.

Caption contest images are stored in Postgres as text. There is no object-storage dependency in the current live path.

## Secrets

Keep the Docker image secret-free. Do not commit `.env.local`, `.env.production`, database URLs, API keys, editor passwords, Vercel tokens, or provider credentials.

Use Resend for outbound submission emails for now. It is already integrated and is simpler for transactional confirmations than Microsoft Graph. Revisit Microsoft Graph only if SHHA requires mail to originate from Microsoft 365 or needs Microsoft 365 audit/compliance controls.

## Backups

At minimum, keep regular Postgres backups. If future uploads are stored on the droplet filesystem, mount them into the container under a persistent host path and include that path in server backups.
