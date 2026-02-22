interface Env {
  BEHOLD_FEED_URL_ART: string;
  BEHOLD_FEED_URL_BJJ: string;
}

const FEED_URL_VARS: Record<string, keyof Env> = {
  art: 'BEHOLD_FEED_URL_ART',
  bjj: 'BEHOLD_FEED_URL_BJJ',
};

const CACHE_TTL = 60 * 60; // 1 hour

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const account = ctx.params.account as string;

  const envKey = FEED_URL_VARS[account];
  if (!envKey) {
    return json({ error: 'Unknown account' }, 404);
  }

  const feedUrl = ctx.env[envKey] as string;
  if (!feedUrl) {
    return json({ error: 'Feed URL not configured' }, 503);
  }

  let body: string;
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) return json({ error: 'Upstream error' }, 502);
    body = await res.text();
  } catch {
    return json({ error: 'Fetch failed' }, 502);
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    },
  });
};

function json(data: object, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
