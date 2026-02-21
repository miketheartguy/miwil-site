interface Env {
  LINKEDIN_KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const data = await ctx.env.LINKEDIN_KV.get('profile');

  if (!data) {
    return new Response(JSON.stringify({ error: 'No profile data' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
