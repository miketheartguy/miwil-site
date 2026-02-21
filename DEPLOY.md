# Deployment Guide

## Architecture

```
Cloudflare Pages (static hosting + Functions)
│
├── dist/                  ← built by Vite; served as static files
│   └── assets/
│
├── functions/api/         ← Cloudflare Pages Functions (Workers runtime)
│   ├── linkedin-auth.ts      starts the OAuth flow
│   ├── linkedin-callback.ts  receives the OAuth code, writes to KV
│   └── linkedin-profile.ts   serves cached profile data to the frontend
│
└── Workers KV: LINKEDIN_KV
    └── key: "profile"        { name, picture, headline, updated_at }
```

The frontend (`src/main.ts`) sets config values synchronously on load, then fires
`fetch('/api/linkedin-profile')` and updates the LinkedIn card if data is present.
If the function returns 404 or errors, the hardcoded `config.linkedin` values remain.

---

## Prerequisites

- Node.js ≥ 18
- A Cloudflare account with Pages enabled
- A LinkedIn Developer App (one-time setup — see below)

---

## One-time setup

### 1. LinkedIn Developer App

1. Go to <https://developer.linkedin.com> → **My Apps** → **Create app**
2. Under the **Products** tab, add **Sign In with LinkedIn using OpenID Connect**
3. Under **Auth** → **OAuth 2.0 settings**, add the redirect URI:
   ```
   https://miwil.com/api/linkedin-callback
   ```
4. Note your **Client ID** and **Client Secret**

### 2. Workers KV namespace

```sh
npx wrangler kv namespace create LINKEDIN_KV
# → outputs: id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

npx wrangler kv namespace create LINKEDIN_KV --preview
# → outputs: preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
```

Paste both IDs into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding    = "LINKEDIN_KV"
id         = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
```

### 3. Secrets

Set these in the Cloudflare dashboard (**Pages → miwil → Settings → Environment variables**)
or via the CLI:

```sh
npx wrangler pages secret put LINKEDIN_CLIENT_ID
npx wrangler pages secret put LINKEDIN_CLIENT_SECRET
npx wrangler pages secret put LINKEDIN_AUTH_SECRET   # any random string you choose
```

`LINKEDIN_AUTH_SECRET` is a passphrase that guards the `/api/linkedin-auth` URL so
only you can kick off the OAuth flow.

### 4. Instagram tokens (if not already set)

```sh
# Copy the example and fill in your long-lived tokens
cp .env.example .env
# edit .env

npm run fetch-instagram   # writes public/data/instagram-*.json
```

---

## Local development

```sh
# 1. Copy secrets to .dev.vars (not committed — gitignored by wrangler by default)
cp .env.example .dev.vars
# edit .dev.vars with real values

# 2. Build the static site
npm run build

# 3. Serve with live Functions on http://localhost:8788
npm run pages:dev
```

Test the full OAuth flow locally:
```
http://localhost:8788/api/linkedin-auth?secret=YOUR_AUTH_SECRET
```
After approving on LinkedIn you land on the callback page. Then check:
```
http://localhost:8788/api/linkedin-profile
```

---

## Deploy

### Typical deploy (Instagram data unchanged)

```sh
npm run deploy
```

This runs `tsc && vite build` then `wrangler pages deploy dist`.

### Full deploy (refresh Instagram posts first)

```sh
npm run deploy:fresh
```

This runs `fetch-instagram` → build → deploy in sequence.
Requires `.env` to be present with valid Instagram tokens.

### Manual steps (equivalent)

```sh
npm run build
npx wrangler pages deploy dist --project-name miwil
```

---

## Refreshing the LinkedIn profile

The profile picture and headline are stored in Workers KV and are **not** automatically
refreshed on each deploy. Run the OAuth flow whenever you want to pull fresh data:

```
https://miwil.com/api/linkedin-auth?secret=YOUR_AUTH_SECRET
```

1. You'll be redirected to LinkedIn to approve
2. On success, the callback page shows your name + photo and confirms the KV write
3. The `/api/linkedin-profile` endpoint returns the new data immediately
4. The site reflects it within one hour (CDN `Cache-Control: max-age=3600`)

To force an immediate cache bust, you can purge the Cloudflare cache from the dashboard.

---

## Type-checking functions

The Cloudflare build compiles the functions itself; the local `tsconfig` is for
editor support and CI checks only.

```sh
npm run typecheck:functions
```

---

## Environment variables reference

| Variable | Where set | Purpose |
|---|---|---|
| `LINKEDIN_CLIENT_ID` | Cloudflare secret | LinkedIn app client ID |
| `LINKEDIN_CLIENT_SECRET` | Cloudflare secret | LinkedIn app client secret |
| `LINKEDIN_AUTH_SECRET` | Cloudflare secret | Passphrase guarding `/api/linkedin-auth` |
| `INSTAGRAM_TOKEN_ART` | `.env` (local) | Long-lived token for `@miketheartguy` |
| `INSTAGRAM_TOKEN_BJJ` | `.env` (local) | Long-lived token for `@mikethemartialartsguy` |

Instagram tokens are only needed locally (the JSON files they produce are committed
to the repo and served as static assets).

---

## npm scripts reference

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (static only, no Functions) |
| `npm run build` | TypeScript check + Vite build → `dist/` |
| `npm run pages:dev` | Full-stack local dev (Functions + KV) on :8788 |
| `npm run deploy` | Build + deploy to Cloudflare Pages |
| `npm run deploy:fresh` | Fetch Instagram → build → deploy |
| `npm run fetch-instagram` | Pull latest posts into `public/data/*.json` |
| `npm run typecheck:functions` | Type-check `functions/` against worker types |
