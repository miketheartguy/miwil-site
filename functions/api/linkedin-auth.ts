interface Env {
  LINKEDIN_KV: KVNamespace;
  LINKEDIN_CLIENT_ID: string;
  LINKEDIN_AUTH_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== ctx.env.LINKEDIN_AUTH_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const state = crypto.randomUUID();

  const redirectUri = `${url.origin}/api/linkedin-callback`;
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', ctx.env.LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid profile email r_liteprofile');
  authUrl.searchParams.set('state', state);

  const isHttps = url.protocol === 'https:';
  const cookieFlags = `HttpOnly; SameSite=Lax; Max-Age=600; Path=/${isHttps ? '; Secure' : ''}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': `li_state=${state}; ${cookieFlags}`,
    },
  });
};
