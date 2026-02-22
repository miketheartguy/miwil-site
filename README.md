# miwil.com

Personal portfolio site for Michael D. Wilson. Single-page, no framework —
TypeScript + Vite frontend, Cloudflare Pages Functions for server-side logic.

Live at **miwil.com** · Hosted on Cloudflare Pages

:sparkles: Now 100% AI-developed! :sparkles:

---

## Local development

```sh
npm install

# Static-only dev server (no Instagram Functions)
npm run dev

# Full-stack dev with Instagram Functions on http://localhost:8788
npm run build
npm run pages:dev
```

---

## Configuration

Most site content is set in **`src/config.ts`**:

- **`name`** — your display name (used as avatar alt text)
- **`instagram.art` / `instagram.bjj`** — handles, bios, and profile URLs for the two Instagram cards
- **`linkedin.url`** — your LinkedIn profile URL; update `title` and optionally `company`
- **`socials`** — the full-width bar at the bottom; add, remove, or reorder entries freely:

```ts
socials: [
  { platform: 'facebook', label: 'Facebook', url: '…', handle: '…' },
  { platform: 'github',   label: 'GitHub',   url: '…', handle: '…' },
  // supported platforms: facebook | github | twitch | youtube | twitter | discord
],
```

---

## Instagram setup

Instagram feeds are served live via [Behold](https://behold.so) — no tokens,
no local scripts, no deploys needed when you post new content.

### Step 1 — Create a Behold account

Go to [behold.so](https://behold.so) and sign up. Connect your Instagram account
when prompted (Behold handles the OAuth).

### Step 2 — Create a feed for each account

In the Behold dashboard, create two feeds:

1. One for `@miketheartguy`
2. One for `@mikethemartialartsguy`

For each feed, copy the **Feed ID** from the feed settings page.

### Step 3 — Add the feed URLs to wrangler.toml

Edit `wrangler.toml`:

```toml
[vars]
BEHOLD_FEED_URL_ART = "https://feeds.behold.so/YOUR_ART_FEED_ID"
BEHOLD_FEED_URL_BJJ = "https://feeds.behold.so/YOUR_BJJ_FEED_ID"
```

Also add these as **Environment variables** in the Cloudflare Pages dashboard
(Settings → Environment variables → Production) so the deployed Function can
read them.

### Step 4 — Deploy

```sh
git add wrangler.toml
git commit -m "Add Behold feed URLs"
git push
```

Feeds are served through `/api/instagram/art` and `/api/instagram/bjj` — Cloudflare
Functions proxy the request to Behold and cache the response for one hour via
`Cache-Control`. New posts appear on the site within an hour of being published,
with no deploys needed.

### Local development

The Instagram Function requires `pages:dev` to run (Vite-only dev won't have it).
Feed cards will show skeleton placeholders under `npm run dev`.

---

## LinkedIn setup

The LinkedIn card is configured statically in `src/config.ts` — no API or OAuth
required.

```ts
linkedin: {
  url:      'https://www.linkedin.com/in/YOUR_HANDLE',
  title:    'Your current job title',
  company:  'Your employer',           // optional
  avatarUrl: '/images/avatar.jpg',     // optional — see below
},
```

To show a profile photo, drop a headshot into `public/images/` and set `avatarUrl`
to the path (e.g. `/images/avatar.jpg`). Update `title` or `company` any time your
role changes, then `git push` to deploy.

---

## Production deployment — Cloudflare Pages Git Integration

This is the recommended deploy path. Every push to `main` triggers an automatic
build and deploy. No CI tokens or GitHub Actions needed.

### Step 1 — Push the repo to GitHub

If you haven't already:

```sh
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com, then:
git remote add origin git@github.com:YOUR_USERNAME/miwil.git
git push -u origin main
```

### Step 2 — Connect to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorise Cloudflare to access your GitHub account and select the `miwil` repo
3. Configure the build:

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. Click **Save and Deploy** — the first build will run immediately

### Step 3 — Set environment variables

In the Cloudflare dashboard: **Pages → miwil → Settings → Environment variables**

Add the following for the **Production** environment:

| Variable | Value |
|---|---|
| `BEHOLD_FEED_URL_ART` | `https://feeds.behold.so/YOUR_ART_FEED_ID` |
| `BEHOLD_FEED_URL_BJJ` | `https://feeds.behold.so/YOUR_BJJ_FEED_ID` |

These are also set in `wrangler.toml` for local dev — the dashboard values take
precedence in production.

### Ongoing workflow

| Task | How |
|---|---|
| Deploy a code change | `git push` — Cloudflare builds and deploys automatically |
| Refresh Instagram photos | Automatic — Behold fetches live on each page load |
| Update LinkedIn details | Edit `src/config.ts` → `git push` |
| Update site content | Edit `src/config.ts` → `git push` |

---

## Manual deployment (alternative)

If you prefer to deploy from your local machine without Git Integration:

```sh
npm run deploy   # build + deploy current state
```

Requires a local Cloudflare login (`npx wrangler login`).

---

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server — static only, no Functions |
| `npm run build` | Type-check + build to `dist/` |
| `npm run preview` | Preview built `dist/` locally |
| `npm run pages:dev` | Full-stack local dev on :8788 (Functions) |
| `npm run deploy` | Build + deploy to Cloudflare Pages |
| `npm run typecheck:functions` | Type-check `functions/` against worker types |
