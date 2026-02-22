// ── Internal Behold API types ─────────────────────────────────────────────

interface BeholdPost {
  id:           string;
  mediaType:    'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl:     string;
  thumbnailUrl?: string;
  sizes: {
    medium: { mediaUrl: string; width: number; height: number };
    [key: string]: { mediaUrl: string; width: number; height: number };
  };
  permalink:  string;
  caption?:   string;
  timestamp:  string;
}

interface BeholdFeed {
  username: string;
  posts:    BeholdPost[];
}

// ── Public types (used by main.ts and renderPhotoGrid) ────────────────────

export interface InstagramPost {
  id:             string;
  media_url:      string;
  thumbnail_url?: string;
  permalink:      string;
  caption?:       string;
  timestamp:      string;
  media_type:     'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface InstagramData {
  handle:     string;
  posts:      InstagramPost[];
  updated_at: string;
}

// ── Mapping ───────────────────────────────────────────────────────────────

function mapPost(p: BeholdPost): InstagramPost {
  // Prefer the optimised medium WebP from Behold's CDN; fall back to the
  // raw Instagram URL if sizes aren't present yet.
  const displayUrl = p.sizes?.medium?.mediaUrl ?? p.mediaUrl;

  return {
    id:            p.id,
    media_url:     displayUrl,
    thumbnail_url: p.mediaType === 'VIDEO' ? displayUrl : undefined,
    permalink:     p.permalink,
    caption:       p.caption,
    timestamp:     p.timestamp,
    media_type:    p.mediaType,
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────

export async function loadInstagramFeed(feedUrl: string): Promise<InstagramData | null> {
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) return null;
    const data = await res.json() as BeholdFeed;
    return {
      handle:     data.username,
      posts:      (data.posts ?? []).map(mapPost),
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ── Rendering (unchanged) ─────────────────────────────────────────────────

export function renderPhotoGrid(
  container: HTMLElement,
  posts: InstagramPost[],
  limit = 6,
): void {
  container.innerHTML = '';
  container.removeAttribute('role');

  const visible = posts.slice(0, limit);

  for (const post of visible) {
    const imgUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
    if (!imgUrl) continue;

    const a = document.createElement('a');
    a.href      = post.permalink;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'photo-item';
    a.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.src      = imgUrl;
    img.alt      = post.caption ? post.caption.slice(0, 80) : 'Instagram post';
    img.loading  = 'lazy';
    img.decoding = 'async';

    if (post.media_type === 'VIDEO') {
      const badge = document.createElement('span');
      badge.className   = 'video-badge';
      badge.textContent = '▶';
      badge.setAttribute('aria-hidden', 'true');
      a.appendChild(badge);
    }

    a.appendChild(img);
    container.appendChild(a);
  }
}

export function renderNoData(container: HTMLElement, profileUrl: string): void {
  container.innerHTML = '';
  container.className = 'photo-grid photo-grid--empty';

  const msg = document.createElement('div');
  msg.className = 'no-data';
  msg.innerHTML = `
    <p>Instagram photos load after Behold setup.</p>
    <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
      Browse profile directly →
    </a>
  `;
  container.appendChild(msg);
}
