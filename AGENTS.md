# AGENTS.md — miwil project reference

Personal portfolio site for Michael D. Wilson. Deployed to Cloudflare Pages.
Single-page, no framework — TypeScript + Vite for the frontend, Cloudflare Pages
Functions (Workers runtime) for server-side logic.

---

## Repository layout

```
miwil/
├── index.html                    Single HTML file; all content is in the markup
├── src/
│   ├── main.ts                   Entry point; wires up all three features
│   ├── config.ts                 Hardcoded fallback values (name, URLs, titles)
│   ├── style.css                 All styles; dark theme with CSS custom properties
│   ├── delaunay-bg.ts            Animated canvas background (d3-delaunay, mouse-reactive)
│   └── instagram.ts              Fetch + render helpers for Instagram photo grids
├── functions/
│   └── api/
│       ├── linkedin-auth.ts      Starts LinkedIn OAuth flow (guarded by secret param)
│       ├── linkedin-callback.ts  Receives OAuth code, fetches profile, writes to KV
│       └── linkedin-profile.ts   Serves cached KV profile data to the frontend
├── scripts/
│   ├── fetch-instagram.ts        Pulls Instagram posts → public/data/*.json
│   └── deploy.ts                 Builds site + deploys to Cloudflare Pages
├── public/
│   └── data/
│       ├── instagram-art.json    Pre-fetched posts for @miketheartguy
│       └── instagram-bjj.json    Pre-fetched posts for @mikethemartialartsguy
├── wrangler.toml                 Cloudflare Pages config + KV namespace binding
├── tsconfig.json                 Root TS config — src/** only, DOM lib, noEmit
├── tsconfig.scripts.json         TS config for scripts/** — node types, noEmit
├── functions/tsconfig.json       TS config for functions/** — workers-types, no DOM
├── vite.config.ts                Minimal Vite config; outDir=dist, target=es2022
├── package.json
├── .env.example                  Template for all required env vars
├── README.md                     Setup guide: Instagram tokens, LinkedIn OAuth, deploy
├── DEPLOY.md                     Supplementary deploy reference
├── .gitignore                    Excludes node_modules, dist, .env, .dev.vars, .wrangler
└── .node-version                 Pins Node 20 for Cloudflare Pages build environment
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Bundler | Vite 5 |
| Language | TypeScript 5 (strict) |
| Runtime types | `@cloudflare/workers-types` for functions; DOM lib for src |
| Canvas animation | `d3-delaunay` |
| Hosting | Cloudflare Pages |
| Server-side logic | Cloudflare Pages Functions (Workers) |
| Persistence | Workers KV (`LINKEDIN_KV` binding) |
| Script runner | `tsx` (for scripts/*, not functions) |
| Deployment CLI | `wrangler` ^4 |

---

## npm scripts

| Script | Command | What it does |
|---|---|---|
| `dev` | `vite` | Vite dev server — static only, no Functions |
| `build` | `tsc && vite build` | Type-check src + build to dist/ |
| `preview` | `vite preview` | Preview built dist/ statically |
| `pages:dev` | `wrangler pages dev dist` | Full-stack local dev on :8788 (Functions + KV) |
| `typecheck:functions` | `tsc -p functions/tsconfig.json` | Type-check functions against worker types |
| `fetch-instagram` | `tsx scripts/fetch-instagram.ts` | Pull latest posts to public/data/*.json |
| `deploy` | `tsx scripts/deploy.ts` | Build + `wrangler pages deploy dist` |
| `deploy:fresh` | `npm run fetch-instagram && tsx scripts/deploy.ts` | Fetch Instagram → build → deploy |

**Note:** `wrangler` is a local devDependency. Use `npx wrangler` for ad-hoc CLI commands —
bare `wrangler` won't be on PATH unless installed globally.

---

## TypeScript config split

Three separate tsconfigs exist to avoid lib conflicts:

| Config | Covers | Libs / Types |
|---|---|---|
| `tsconfig.json` | `src/**` | `ES2022`, `DOM`, `DOM.Iterable` |
| `tsconfig.scripts.json` | `scripts/**` | `ES2022`, `node` |
| `functions/tsconfig.json` | `functions/**` | `ES2022`, `@cloudflare/workers-types` (no DOM) |

`tsc && vite build` only runs the root tsconfig. Functions are compiled by Cloudflare
on deploy; the functions tsconfig is for editor support and `npm run typecheck:functions`.

---

## Features

### 1. Animated canvas background (`src/delaunay-bg.ts`)

- `DelaunayBg` class wraps a full-screen `<canvas id="bg">`.
- 90 randomly placed points drift in Lissajous-style orbits; 8 anchors pin corners.
- Mouse within 300 px attracts points; within 90 px repels them.
- Triangle fill/stroke colours are HSL, shifting hue + lightness near the cursor.
- ResizeObserver reinitialises points on viewport change.
- `bg.stop()` cancels the rAF loop (not currently called — useful if needed).

### 2. Instagram feeds (`src/instagram.ts`, `scripts/fetch-instagram.ts`)

**Static JSON approach** — no API calls at runtime:
- `scripts/fetch-instagram.ts` hits the Instagram Graph API and writes
  `public/data/instagram-art.json` and `public/data/instagram-bjj.json`.
- The static files are committed and served from `dist/`.
- `loadInstagramFeed(dataFile)` fetches the JSON; `renderPhotoGrid()` injects
  `<a class="photo-item">` elements into `#art-grid` / `#bjj-grid`.
- If the JSON is absent or empty, `renderNoData()` shows a fallback message.

Instagram JSON shape:
```ts
{ handle: string; updated_at: string; posts: InstagramPost[] }
// InstagramPost: id, media_url, thumbnail_url?, permalink, caption?, timestamp, media_type
```

Tokens are long-lived (60 days). Store in `.env`, never commit. Refresh via
`refreshToken()` exported from `fetch-instagram.ts`.

### 3. LinkedIn card (`functions/api/`, `src/main.ts`)

**Three-phase approach:**
1. **Synchronous** — `config.linkedin.{url,title}` values are set immediately on load.
2. **Async** — `initLinkedIn()` fetches `/api/linkedin-profile` (the KV cache).
3. **Fallback** — any fetch error leaves phase-1 values intact; no flash of broken state.

**OAuth flow** (triggered manually, not on every visit):
```
GET /api/linkedin-auth?secret=LINKEDIN_AUTH_SECRET
  → sets li_state cookie (HttpOnly, SameSite=Lax, 10 min TTL)
  → 302 → LinkedIn OAuth (scope: openid profile email r_liteprofile)

GET /api/linkedin-callback?code=…&state=…
  → validates state cookie
  → POST linkedin token endpoint → access_token
  → GET /v2/userinfo         → { name, picture }
  → GET /v2/me?projection=…  → { localizedHeadline } (optional, silently ignored if 4xx)
  → KV.put('profile', JSON)  → { name, picture, headline, updated_at }
  → clears cookie, returns styled success HTML

GET /api/linkedin-profile
  → KV.get('profile') → JSON or 404
  → Cache-Control: public, max-age=3600
```

KV key: `"profile"`. Value shape:
```ts
{ name: string; picture: string; headline: string; updated_at: string }
```

**DOM IDs the LinkedIn code depends on:**
- `#linkedin-link` — `<a>` — href set to LinkedIn profile URL
- `#linkedin-cta` — `<a>` — same URL
- `#linkedin-title` — `<p>` — job headline / title text
- `#linkedin-avatar` — `<div>` — replaced with `<img class="avatar-img">` when picture available
- `#linkedin-company` — `<p>` — optional company name (from `config.linkedin.company`)

---

## Environment variables

| Variable | Used by | How to set |
|---|---|---|
| `LINKEDIN_CLIENT_ID` | `linkedin-auth.ts`, `linkedin-callback.ts` | Cloudflare Pages secret |
| `LINKEDIN_CLIENT_SECRET` | `linkedin-callback.ts` | Cloudflare Pages secret |
| `LINKEDIN_AUTH_SECRET` | `linkedin-auth.ts` (guards auth URL) | Cloudflare Pages secret |
| `INSTAGRAM_TOKEN_ART` | `scripts/fetch-instagram.ts` | `.env` (local only) |
| `INSTAGRAM_TOKEN_BJJ` | `scripts/fetch-instagram.ts` | `.env` (local only) |

For local Pages Functions dev, put Cloudflare secrets in `.dev.vars` (wrangler reads
this automatically; it is gitignored by default and should never be committed).

---

## `wrangler.toml` — pending action

The KV namespace `id` and `preview_id` fields are blank placeholders. Before deploying:

```sh
npx wrangler kv namespace create LINKEDIN_KV
npx wrangler kv namespace create LINKEDIN_KV --preview
```

Paste both returned IDs into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding    = "LINKEDIN_KV"
id         = "<production id>"
preview_id = "<preview id>"
```

---

## `src/config.ts` — values to update

```ts
linkedin: {
  url:     'https://www.linkedin.com/in/YOUR_HANDLE',   // ← update
  title:   'Senior Healthcare Data & Analytics Professional', // fallback headline
  company: '',        // optional — shown in #linkedin-company
  avatarUrl: '',      // optional static override; '' = initials avatar shown
}
```

`config.name` (`'Michael D. Wilson'`) is used as `alt` text for the LinkedIn avatar image.

---

## Styling notes (`src/style.css`)

CSS custom properties defined on `:root`:
- `--bg` `--surface` `--border` `--border-hover` — backgrounds / borders
- `--cyan` `--purple` `--pink` `--amber` — accent colours
- `--text` `--text-muted` — foreground
- `--font-sans` (Space Grotesk) `--font-mono` (Space Mono)
- `--radius-card: 18px` `--blur-card: 22px` `--gap: 1.1rem`

Layout is a CSS grid: sidebar + 3-column `cards-area` on desktop → 2-col on tablet
(≤1024 px, `#linkedin-card` spans full width) → 1-col on mobile (≤600 px).

Cards animate in on load with `cardIn` keyframe (staggered delays: 0.05 / 0.15 / 0.25 s).
`prefers-reduced-motion` disables all animations.

---

## Conventions

- No framework; no JSX; no state management library.
- All DOM manipulation is vanilla — `document.getElementById`, `createElement`, etc.
- Functions never throw to the top level; all async paths catch and silently degrade.
- `as const` on `config` object prevents accidental mutation.
- `scripts/` use `tsx` + `dotenv/config`; they are Node scripts, not bundled.
- Functions export a single `onRequest: PagesFunction<Env>` — Cloudflare's convention.
- Each function file declares its own local `interface Env` with only the bindings it needs.
- Secrets guard sensitive endpoints (`LINKEDIN_AUTH_SECRET`) rather than relying on
  obscurity of the URL alone.

---

## Known limitations / future work

- LinkedIn profile refresh is **manual** — someone must visit the auth URL. There is no
  scheduled cron to auto-refresh. (Cloudflare Workers Cron Triggers could do this but
  are not set up.)
- `r_liteprofile` scope for `localizedHeadline` may be denied by LinkedIn if the app
  hasn't been approved for it; the callback silently falls back to an empty headline.
- Instagram tokens expire after 60 days. `refreshToken()` in `fetch-instagram.ts` can
  be called manually or wired into a cron/CI job.
- `config.linkedin.avatarUrl` static override is still supported; if set, `initLinkedIn()`
  won't overwrite it because the `picture` field from KV would replace it — remove
  `avatarUrl` from config once OAuth is live.
- The site has no favicon.
