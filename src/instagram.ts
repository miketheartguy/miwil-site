export interface InstagramPost {
  id:            string;
  media_url:     string;
  thumbnail_url?: string;
  permalink:     string;
  caption?:      string;
  timestamp:     string;
  media_type:    'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface InstagramData {
  handle:     string;
  posts:      InstagramPost[];
  updated_at: string;
}

export async function loadInstagramFeed(dataFile: string): Promise<InstagramData | null> {
  try {
    const res = await fetch(dataFile);
    if (!res.ok) return null;
    return (await res.json()) as InstagramData;
  } catch {
    return null;
  }
}

export function renderPhotoGrid(
  container: HTMLElement,
  posts: InstagramPost[],
  limit = 6,
): void {
  container.innerHTML = '';
  container.removeAttribute('role'); // was 'list' for skeleton state

  const visible = posts.slice(0, limit);

  for (const post of visible) {
    const imgUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
    if (!imgUrl) continue;

    const a = document.createElement('a');
    a.href   = post.permalink;
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    a.className = 'photo-item';
    a.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.src     = imgUrl;
    img.alt     = post.caption ? post.caption.slice(0, 80) : 'Instagram post';
    img.loading = 'lazy';
    img.decoding = 'async';

    // Subtle video badge
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
    <p>Instagram photos load after API setup.</p>
    <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
      Browse profile directly →
    </a>
  `;
  container.appendChild(msg);
}
