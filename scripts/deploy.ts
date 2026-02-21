/**
 * Build the site and deploy to Cloudflare Pages.
 *
 * Usage:
 *   npm run deploy              – build + deploy
 *   npm run deploy:fresh        – fetch Instagram → build + deploy
 *
 * What it does:
 *   1. Runs `tsc && vite build` to produce dist/
 *   2. Runs `wrangler pages deploy dist` to push to Cloudflare Pages
 *   3. Prints the post-deploy reminder to refresh the LinkedIn profile
 */

import { spawnSync } from 'node:child_process';

function run(cmd: string, args: string[]): void {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// 1. Build
run('npm', ['run', 'build']);

// 2. Deploy
run('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'miwil']);

// 3. Reminder
console.log(`
────────────────────────────────────────────────────────────
  Deploy complete.

  If you need to refresh your LinkedIn profile data, visit:
    https://miwil.com/api/linkedin-auth?secret=YOUR_SECRET

  The site will show the updated picture + headline within
  an hour (Cache-Control: max-age=3600 on /api/linkedin-profile).
────────────────────────────────────────────────────────────
`);
