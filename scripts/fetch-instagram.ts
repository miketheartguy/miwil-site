/**
 * Fetch the latest Instagram posts and write them to public/data/*.json
 *
 * Prerequisites:
 *   1. Convert your Instagram accounts to Creator or Business accounts.
 *   2. Create a Facebook Developer app with the Instagram Graph API product.
 *   3. Generate long-lived access tokens (valid 60 days, refreshable).
 *   4. Copy .env.example → .env and fill in both tokens.
 *
 * Usage:
 *   npm run fetch-instagram
 *
 * Add this to your CI/CD pipeline or run it manually before deploying.
 * Long-lived tokens can be refreshed programmatically — see the refresh
 * function at the bottom of this file.
 */

import 'dotenv/config';
import fs   from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '..', 'public', 'data');

interface MediaItem {
  id:             string;
  media_url:      string;
  thumbnail_url?: string;
  permalink:      string;
  caption?:       string;
  timestamp:      string;
  media_type:     'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface ApiResponse {
  data:   MediaItem[];
  paging: unknown;
}

async function fetchFeed(token: string, limit = 9): Promise<MediaItem[]> {
  const fields = [
    'id',
    'media_url',
    'thumbnail_url',
    'permalink',
    'caption',
    'timestamp',
    'media_type',
  ].join(',');

  const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${token}`;
  const res  = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as ApiResponse;
  return json.data;
}

async function writeData(filename: string, handle: string, posts: MediaItem[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const out = {
    handle,
    updated_at: new Date().toISOString(),
    posts,
  };
  await fs.writeFile(
    path.join(DATA_DIR, filename),
    JSON.stringify(out, null, 2),
    'utf8',
  );
  console.log(`✓ Wrote ${posts.length} posts → public/data/${filename}`);
}

/**
 * Refresh a long-lived token before it expires (call this every ~50 days).
 */
export async function refreshToken(token: string): Promise<string> {
  const url  = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
  const res  = await fetch(url);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  console.log(`Token refreshed. Expires in ${json.expires_in}s (~${Math.round(json.expires_in / 86400)} days)`);
  return json.access_token;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const TOKEN_ART = process.env['INSTAGRAM_TOKEN_ART'];
const TOKEN_BJJ = process.env['INSTAGRAM_TOKEN_BJJ'];

if (!TOKEN_ART && !TOKEN_BJJ) {
  console.error('No Instagram tokens found. Copy .env.example to .env and fill in your tokens.');
  process.exit(1);
}

const tasks: Promise<void>[] = [];

if (TOKEN_ART) {
  tasks.push(
    fetchFeed(TOKEN_ART)
      .then(posts => writeData('instagram-art.json', 'miketheartguy', posts))
      .catch(err  => console.error('Error fetching @miketheartguy:', err)),
  );
}

if (TOKEN_BJJ) {
  tasks.push(
    fetchFeed(TOKEN_BJJ)
      .then(posts => writeData('instagram-bjj.json', 'mikethemartialartsguy', posts))
      .catch(err  => console.error('Error fetching @mikethemartialartsguy:', err)),
  );
}

await Promise.all(tasks);
