import { DelaunayBg } from './delaunay-bg';
import { loadInstagramFeed, renderPhotoGrid, renderNoData } from './instagram';
import { config } from './config';

// ── Canvas background ────────────────────────────────────────────────────────

const canvas = document.getElementById('bg') as HTMLCanvasElement;
const bg = new DelaunayBg(canvas);
bg.start();

// ── LinkedIn card ────────────────────────────────────────────────────────────

const li = config.linkedin;

// Set links and fallback values immediately (synchronous)
(document.getElementById('linkedin-link') as HTMLAnchorElement).href = li.url;
(document.getElementById('linkedin-cta')  as HTMLAnchorElement).href = li.url;
(document.getElementById('linkedin-title') as HTMLElement).textContent = li.title;

if (li.company) {
  (document.getElementById('linkedin-company') as HTMLElement).textContent = li.company;
}

if (li.avatarUrl) {
  const avatarEl = document.getElementById('linkedin-avatar') as HTMLElement;
  avatarEl.innerHTML = '';
  const img = document.createElement('img');
  img.src       = li.avatarUrl;
  img.alt       = config.name;
  img.className = 'avatar-img';
  avatarEl.appendChild(img);
}

async function initLinkedIn(): Promise<void> {
  try {
    const res = await fetch('/api/linkedin-profile');
    if (!res.ok) return;

    const data = await res.json() as {
      name?: string;
      picture?: string;
      headline?: string;
      updated_at?: string;
    };

    if (data.headline) {
      (document.getElementById('linkedin-title') as HTMLElement).textContent = data.headline;
    }

    if (data.picture) {
      const avatarEl = document.getElementById('linkedin-avatar') as HTMLElement;
      avatarEl.innerHTML = '';
      const img = document.createElement('img');
      img.src       = data.picture;
      img.alt       = data.name ?? config.name;
      img.className = 'avatar-img';
      avatarEl.appendChild(img);
    }
  } catch {
    // silently fall back to config values shown above
  }
}

initLinkedIn();

// ── Instagram feeds ───────────────────────────────────────────────────────────

async function initInstagram(
  dataFile: string,
  gridId:   string,
  profileUrl: string,
) {
  const grid = document.getElementById(gridId) as HTMLElement;
  const data = await loadInstagramFeed(dataFile);

  if (data && data.posts.length > 0) {
    renderPhotoGrid(grid, data.posts, 6);
  } else {
    renderNoData(grid, profileUrl);
  }
}

initInstagram(config.instagram.art.dataFile, 'art-grid', config.instagram.art.url);
initInstagram(config.instagram.bjj.dataFile, 'bjj-grid', config.instagram.bjj.url);

// ── Social links bar ──────────────────────────────────────────────────────

const SOCIAL_ICONS: Record<string, string> = {
  facebook: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
  github:   `<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>`,
  twitch:   `<path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"/>`,
  youtube:  `<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>`,
  twitter:  `<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>`,
  discord:  `<path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.049.184.11.252a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.17 13.17 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>`,
};

const socialContainer = document.getElementById('social-links') as HTMLElement;
socialContainer.innerHTML = config.socials.map(s => `
  <a class="social-link" href="${s.url}" target="_blank" rel="noopener noreferrer" aria-label="${s.label}">
    <svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${SOCIAL_ICONS[s.platform] ?? ''}
    </svg>
    <span class="social-info">
      <span class="social-name">${s.label}</span>
      <span class="social-handle">@${s.handle}</span>
    </span>
  </a>
`).join('');

