// Builds the game-portal version (CrazyGames, itch.io, GameDistribution...) into dist-portal/
// and zips it as dist-portal.zip. Usage: npm run build:portal [-- crazygames]
// Same game as /play/, but: relative paths, no takeoutfox.com requests (board stays on the
// device, no stats, no service worker), no outgoing links, portal SDK when one is named.
import { readFileSync, writeFileSync, rmSync, existsSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';

const portal = process.argv[2] || 'crazygames';
const src = readFileSync('play/index.html', 'utf8');
let html = src
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '')
  .replace(/<meta name="apple-mobile-web-app-capable"[^>]*>\n?/, '')
  .replace(/<link rel="canonical"[^>]*>\n?/, '')
  .replace(/<meta property="og:[^>]*>\n?/g, '')
  .replace(/<meta name="twitter:[^>]*>\n?/g, '')
  .replace(/<script type='module' src='https:\/\/static\.cloudflareinsights\.com[^<]*<\/script>\n?/, '')
  .replace(/<p class="set-note" style="margin:0"><a href="\/privacy\/"[\s\S]*?<\/p>/, '')
  .replace(/href="\/favicon\.png"/g, 'href="favicon.png"')
  .replace(/url\(\/art\//g, 'url(art/');
if (portal === 'crazygames') html = html.replace('</head>', '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n</head>');
writeFileSync('index.portal.html', html);

rmSync('dist-portal', { recursive: true, force: true });
try {
  execSync('npx vite build --outDir dist-portal', {
    stdio: 'inherit',
    env: { ...process.env, VITE_PORTAL: portal, VITE_BASE: './', TF_PORTAL_BUILD: '1' },
  });
} finally {
  rmSync('index.portal.html', { force: true });
}
renameSync('dist-portal/index.portal.html', 'dist-portal/index.html');
for (const f of ['api', 'sw.js', 'manifest.webmanifest', 'googlee68d6b9b40b03c9a.html', 'og.jpg', '404.html', 'sitemap.xml', 'robots.txt']) rmSync(`dist-portal/${f}`, { recursive: true, force: true });
if (existsSync('dist-portal.zip')) rmSync('dist-portal.zip');
execSync('cd dist-portal && zip -qr ../dist-portal.zip .');
console.log(`portal build (${portal}) -> dist-portal/ and dist-portal.zip`);
