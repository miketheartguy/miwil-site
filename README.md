# miwil

Personal portfolio site for Michael D. Wilson. Single-page, no framework —
TypeScript + Vite frontend, Cloudflare Pages Functions for server-side logic.

Live at **miwil.com** · Hosted on Cloudflare Pages

---

## Local development

```sh
npm install

# Static-only dev server (no LinkedIn API)
npm run dev

# Full-stack dev with LinkedIn API on http://localhost:8788
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

Instagram photos are served from static JSON files that you populate locally and
commit. No API calls happen at runtime.

### Step 1 — Switch both accounts to Creator or Business

Instagram's API **does not work with personal accounts**. For each account:

> Settings → Account type and category → Switch to Professional Account → **Creator**

Do this for both `@miketheartguy` and `@mikethemartialartsguy`.

### Step 2 — Create a Facebook Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Choose type **Business**
3. Under **Add Products**, add **Instagram Graph API**
4. Under **App Settings → Basic**, note your **App ID** and **App Secret**

### Step 3 — Get a long-lived token for each account

You need one token per Instagram account.

1. Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app, then select the Instagram account
3. Request permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`
4. Click **Generate Access Token** and approve
5. Exchange the short-lived token for a long-lived one (valid 60 days):

```sh
curl "https://graph.instagram.com/access_token\
?grant_type=ig_exchange_token\
&client_secret=YOUR_APP_SECRET\
&access_token=SHORT_LIVED_TOKEN"
```

The response contains `access_token` — that's your long-lived token. Repeat for
the second account.

### Step 4 — Add tokens and fetch posts

```sh
cp .env.example .env
```

Edit `.env`:

```
INSTAGRAM_TOKEN_ART=long_lived_token_for_miketheartguy
INSTAGRAM_TOKEN_BJJ=long_lived_token_for_mikethemartialartsguy
```

Then pull the latest posts:

```sh
npm run fetch-instagram
```

You should see:

```
✓ Wrote 9 posts → public/data/instagram-art.json
✓ Wrote 9 posts → public/data/instagram-bjj.json
```

Commit the updated JSON files and deploy.

### Token maintenance

Long-lived tokens expire after **60 days**. Refresh before they expire:

```sh
curl "https://graph.instagram.com/refresh_access_token\
?grant_type=ig_refresh_token\
&access_token=YOUR_LONG_LIVED_TOKEN"
```

Update `.env` with the new token, re-run `npm run fetch-instagram`, and redeploy.
Or use `npm run deploy:fresh` to do the fetch + build + deploy in one step.

---

## LinkedIn setup

The LinkedIn card shows your profile photo and headline, fetched via OAuth and
cached in Cloudflare Workers KV. The OAuth flow runs **once** (or whenever you
want to refresh it) — not on every visitor load.

### Step 1 — Create a LinkedIn Developer App

1. Go to [developer.linkedin.com](https://developer.linkedin.com) → **My Apps** → **Create app**
2. Under the **Products** tab, add **Sign In with LinkedIn using OpenID Connect**
3. Under **Auth → OAuth 2.0 settings**, add the redirect URI:
   ```
   https://miwil.com/api/linkedin-callback
   ```
4. Note your **Client ID** and **Client Secret**

### Step 2 — Create a Workers KV namespace

```sh
npx wrangler kv namespace create LINKEDIN_KV
# → note the id

npx wrangler kv namespace create LINKEDIN_KV --preview
# → note the preview_id
```

Paste both IDs into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding    = "LINKEDIN_KV"
id         = "<production id>"
preview_id = "<preview id>"
```

### Step 3 — Set secrets in Cloudflare

In the Cloudflare dashboard under **Pages → miwil → Settings → Environment variables**,
or via CLI:

```sh
npx wrangler pages secret put LINKEDIN_CLIENT_ID
npx wrangler pages secret put LINKEDIN_CLIENT_SECRET
npx wrangler pages secret put LINKEDIN_AUTH_SECRET   # any random string you choose
```

`LINKEDIN_AUTH_SECRET` is a passphrase that guards the auth URL so only you can
trigger the OAuth flow.

### Step 4 — Run the OAuth flow

After deploying, visit:

```
https://miwil.com/api/linkedin-auth?secret=YOUR_AUTH_SECRET
```

You'll be redirected to LinkedIn to approve, then returned to a confirmation page
showing your name and photo. The profile is now stored in KV and the card will
update within one hour (CDN cache). To see it immediately, purge the Cloudflare
cache from the dashboard.

Re-run this URL any time you want to refresh your photo or headline.

### Local testing

For local Pages Functions dev, copy your secrets to `.dev.vars` (never commit this):

```sh
cp .env.example .dev.vars
# edit .dev.vars with real LinkedIn values
npm run build && npm run pages:dev
```

Then test at:

```
http://localhost:8788/api/linkedin-auth?secret=YOUR_AUTH_SECRET
```

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
| `LINKEDIN_CLIENT_ID` | From your LinkedIn Developer App |
| `LINKEDIN_CLIENT_SECRET` | From your LinkedIn Developer App |
| `LINKEDIN_AUTH_SECRET` | Any random string you choose |

These are the only secrets Cloudflare needs at build/runtime. Instagram tokens
stay in your local `.env` and are never deployed — only the JSON files they
produce are committed to the repo.

### Step 4 — Create and bind the Workers KV namespace

The LinkedIn card caches profile data in Workers KV. Create the namespace once:

```sh
npx wrangler kv namespace create LINKEDIN_KV
# → copy the returned id

npx wrangler kv namespace create LINKEDIN_KV --preview
# → copy the returned preview_id
```

Paste both IDs into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding    = "LINKEDIN_KV"
id         = "<production id>"
preview_id = "<preview id>"
```

Commit and push that change. Then bind the namespace in the dashboard:

**Pages → miwil → Settings → Functions → KV namespace bindings → Add binding**

| Variable name | KV namespace |
|---|---|
| `LINKEDIN_KV` | `LINKEDIN_KV` (the namespace you just created) |

### Step 5 — Trigger the LinkedIn OAuth flow

Once the site is live, visit this URL in your browser (you'll be redirected to
LinkedIn to approve, then land on a confirmation page):

```
https://miwil.com/api/linkedin-auth?secret=YOUR_LINKEDIN_AUTH_SECRET
```

Your profile photo and headline are now stored in KV and will appear on the site
within one hour (CDN cache). Re-visit this URL any time you want to refresh them.

### Ongoing workflow

| Task | How |
|---|---|
| Deploy a code change | `git push` — Cloudflare builds and deploys automatically |
| Refresh Instagram photos | `npm run fetch-instagram` → `git add public/data/ && git commit && git push` |
| Refresh LinkedIn profile | Visit the `/api/linkedin-auth?secret=…` URL |
| Update site content | Edit `src/config.ts` → `git push` |

---

## Manual deployment (alternative)

If you prefer to deploy from your local machine without Git Integration:

```sh
npm run deploy          # build + deploy current state
npm run deploy:fresh    # fetch Instagram → build → deploy
```

Requires a local Cloudflare login (`npx wrangler login`) and valid tokens in `.env`.

---

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server — static only, no Functions |
| `npm run build` | Type-check + build to `dist/` |
| `npm run preview` | Preview built `dist/` locally |
| `npm run pages:dev` | Full-stack local dev on :8788 (Functions + KV) |
| `npm run fetch-instagram` | Pull latest posts → `public/data/*.json` |
| `npm run deploy` | Build + deploy to Cloudflare Pages |
| `npm run deploy:fresh` | Fetch Instagram → build → deploy |
| `npm run typecheck:functions` | Type-check `functions/` against worker types |
