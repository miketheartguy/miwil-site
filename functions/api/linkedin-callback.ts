interface Env {
  LINKEDIN_KV: KVNamespace;
  LINKEDIN_CLIENT_ID: string;
  LINKEDIN_CLIENT_SECRET: string;
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=').trim()];
    }),
  );
}

function htmlPage(title: string, body: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 4rem auto; padding: 1rem; text-align: center; }
    h1 { font-size: 1.5rem; }
    p { color: #555; }
  </style>
</head>
<body>${body}</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return htmlPage(
      'LinkedIn OAuth — Error',
      '<h1>Missing parameters</h1><p>The OAuth callback is missing <code>code</code> or <code>state</code>.</p>',
    );
  }

  const cookies = parseCookies(ctx.request.headers.get('Cookie'));
  if (cookies['li_state'] !== state) {
    return htmlPage(
      'LinkedIn OAuth — Error',
      '<h1>State mismatch</h1><p>CSRF check failed. Please try again.</p>',
    );
  }

  const redirectUri = `${url.origin}/api/linkedin-callback`;

  // Exchange code for access token
  let accessToken: string;
  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: ctx.env.LINKEDIN_CLIENT_ID,
        client_secret: ctx.env.LINKEDIN_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`);
    }
    const tokenData = await tokenRes.json<{ access_token: string }>();
    accessToken = tokenData.access_token;
  } catch (err) {
    return htmlPage(
      'LinkedIn OAuth — Error',
      `<h1>Token exchange failed</h1><p>${String(err)}</p>`,
    );
  }

  // Fetch userinfo (name + picture)
  let name = '';
  let picture = '';
  try {
    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) throw new Error(`userinfo ${userRes.status}`);
    const user = await userRes.json<{ name?: string; picture?: string }>();
    name = user.name ?? '';
    picture = user.picture ?? '';
  } catch (err) {
    return htmlPage(
      'LinkedIn OAuth — Error',
      `<h1>Failed to fetch profile</h1><p>${String(err)}</p>`,
    );
  }

  // Fetch headline (optional — may 403 if scope denied)
  let headline = '';
  try {
    const meRes = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,localizedHeadline)',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (meRes.ok) {
      const me = await meRes.json<{ localizedHeadline?: string }>();
      headline = me.localizedHeadline ?? '';
    }
  } catch {
    // ignore — headline is optional
  }

  // Persist to KV
  await ctx.env.LINKEDIN_KV.put(
    'profile',
    JSON.stringify({ name, picture, headline, updated_at: new Date().toISOString() }),
  );

  // Clear the state cookie
  const isHttps = url.protocol === 'https:';
  const clearCookie = `li_state=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/${isHttps ? '; Secure' : ''}`;

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LinkedIn OAuth — Success</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 4rem auto; padding: 1rem; text-align: center; }
    h1 { font-size: 1.5rem; color: #0a66c2; }
    p { color: #555; }
    img { width: 80px; height: 80px; border-radius: 50%; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>Profile saved!</h1>
  ${picture ? `<img src="${picture}" alt="${name}">` : ''}
  <p><strong>${name}</strong></p>
  ${headline ? `<p>${headline}</p>` : ''}
  <p>Data written to KV. The site will reflect these changes within an hour.</p>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookie,
      },
    },
  );
};
