/**
 * Build-time renderer for the site pages around the game. Runs in vite.config (Node), never in
 * the browser: every page ships as finished HTML so search engines read it without scripts.
 * Same approach as hello-pip's landing (src/landing/render.ts there).
 */
import { CAST_PAGE, COMMON, DISTRICTS_PAGE, HOME, HOW, NAME, PAGES, SITE, TIPS_PAGE, type Page } from './content';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const art = (n: string) => `/art/${n}.webp`;
const page = (id: string) => PAGES.find((p) => p.id === id)!;
const url = (p: Page) => SITE + p.path;

/** Cloudflare Web Analytics (cookie-free), same as hellopip.si. */
export const BEACON = `<script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "02b7c493374c43c3997c788cce2c66b5"}'></script>`;

const CSS = `
:root{--bg:#fff6e8;--paper:#fffdf8;--ink:#3b2116;--muted:#7a5440;--accent:#ff7a1a;--accent-d:#b34a00;--teal:#1f8a7e;--line:#f0dcc0;--hero:#2a1b14}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent-d)}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px}
.top{position:sticky;top:0;z-index:5;background:rgba(255,246,232,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;gap:14px;min-height:56px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:8px;font-weight:900;font-size:19px;color:var(--ink);text-decoration:none;margin-right:auto}
.brand img{width:32px;height:32px;border-radius:8px}
.top nav{display:flex;gap:14px;flex-wrap:wrap;font-size:15px;font-weight:700}
.top nav a{color:var(--muted);text-decoration:none}
.top nav a[aria-current]{color:var(--ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);color:#fff;border-radius:999px;padding:14px 30px;font-weight:900;font-size:20px;text-decoration:none;box-shadow:0 5px 0 var(--accent-d);transition:transform .08s}
.btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--accent-d)}
.btn.small{padding:8px 18px;font-size:15px;box-shadow:0 3px 0 var(--accent-d)}
.hero{background:var(--hero);color:#fff7e6;overflow:hidden}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:32px;align-items:center;padding-top:40px;padding-bottom:40px}
.hero h1{font-size:clamp(44px,8vw,82px);line-height:.95;margin:0 0 14px;color:#fff;-webkit-text-stroke:2px #8a3a12;paint-order:stroke fill;letter-spacing:-.5px}
.hero p.lead{font-size:clamp(17px,2.2vw,21px);margin:0 0 22px;color:#fbe6cc}
.hero .note{font-size:14px;color:#d9b99a;margin:14px 0 0}
.hero .poster{border-radius:22px;box-shadow:0 18px 40px rgba(0,0,0,.45);transform:rotate(2deg);max-height:640px;width:auto;margin:0 auto}
.feat{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:22px 0 0;padding:0;list-style:none}
.feat li{background:rgba(255,255,255,.07);border-radius:14px;padding:12px 14px;font-size:15px;color:#fbe6cc}
.feat b{display:block;color:#fff;font-size:16px}
.page-head{background:var(--hero);color:#fff7e6;padding:34px 0 30px}
.page-head h1{margin:0 0 8px;font-size:clamp(30px,5vw,48px);line-height:1.1;color:#fff}
.page-head p{margin:0;max-width:760px;color:#fbe6cc;font-size:18px}
.crumbs{font-size:14px;margin:0 0 10px;color:#d9b99a}.crumbs a{color:#ffc58f}
main section{padding:38px 0 6px}
h2{font-size:clamp(25px,3.4vw,34px);line-height:1.15;margin:0 0 12px}
h3{font-size:20px;margin:0 0 6px}
.grid{display:grid;gap:18px}
.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
.card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 3px 0 var(--line)}
.card img{border-radius:12px;margin:0 0 12px;width:100%;object-fit:cover}
.card p{margin:0;color:var(--muted)}
.story img{aspect-ratio:9/14}
.cast img{aspect-ratio:1/1;object-fit:contain;background:#fbe9d2}
.power img{width:72px;height:72px;object-fit:contain;margin:0 0 8px;border-radius:0}
.wide img{aspect-ratio:16/9}
table{width:100%;border-collapse:collapse;background:var(--paper);border-radius:14px;overflow:hidden;border:1px solid var(--line)}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);font-size:16px}
th{background:#fbe9d2}
.faq details{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:0 0 10px}
.faq summary{font-weight:800;cursor:pointer}
.faq p{margin:8px 0 0;color:var(--muted)}
.band{background:#ffe7c8;border-radius:22px;padding:24px;margin:34px 0 0;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.band h2{margin:0}
.prose{max-width:760px}
ol.tips{padding-left:22px}ol.tips li{margin:0 0 14px}
.foot{margin:48px 0 0;background:var(--hero);color:#d9b99a;padding:34px 0 40px;font-size:15px}
.foot a{color:#ffc58f}
.foot h2{color:#fff7e6;font-size:20px}
.foot ul{list-style:none;padding:0;margin:0 0 18px}
.foot li{margin:0 0 6px}
.foot .cols{display:grid;grid-template-columns:1fr 1.4fr;gap:28px}
@media (max-width:820px){.hero .wrap{grid-template-columns:1fr}.hero .poster{max-height:420px}.g3,.g4{grid-template-columns:repeat(2,1fr)}.feat{grid-template-columns:1fr}.foot .cols{grid-template-columns:1fr}}
@media (max-width:520px){.g2,.g3{grid-template-columns:1fr}.top nav{font-size:14px;gap:10px}}
`;

function head(p: Page, ld: object[]) {
  const og = SITE + 'og.jpg';
  return `<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}" />
<link rel="canonical" href="${url(p)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${NAME}" />
<meta property="og:url" content="${url(p)}" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:image" content="${og}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)}" />
<meta name="twitter:description" content="${esc(p.description)}" />
<meta name="twitter:image" content="${og}" />
<style>${CSS.replace(/\n/g, '')}</style>
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
${BEACON}`;
}

function top(current: string) {
  const links = PAGES.filter((p) => p.id !== 'home')
    .map((p) => `<a href="/${p.path}"${p.id === current ? ' aria-current="page"' : ''}>${esc(p.nav === 'Tips for a high score' ? 'Tips' : p.nav)}</a>`).join('');
  return `<header class="top"><div class="wrap"><a class="brand" href="/"><img src="/icons/icon-64.png" alt="" width="32" height="32" />${NAME}</a><nav aria-label="Guides">${links}</nav><a class="btn small" href="/play/">${COMMON.play_short}</a></div></header>`;
}

function foot() {
  const guides = PAGES.map((p) => `<li><a href="/${p.path}">${esc(p.id === 'home' ? `${NAME} home` : p.nav)}</a></li>`).join('') + `<li><a href="/play/">Play ${NAME}</a></li>`;
  const more = COMMON.more.map(([h, n, t]) => `<li><a href="${h}">${esc(n)}</a>: ${esc(t)}</li>`).join('');
  return `<footer class="foot"><div class="wrap cols">
<div><h2>${NAME}</h2><ul>${guides}</ul></div>
<div><h2>${esc(COMMON.more_heading)}</h2><ul>${more}</ul><p>${esc(COMMON.footer_fiction)}</p><p>${esc(COMMON.footer_privacy)}</p></div>
</div></footer>`;
}

const crumbsLd = (p: Page) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: NAME, item: SITE },
    { '@type': 'ListItem', position: 2, name: p.nav, item: url(p) },
  ],
});
const gameLd = () => ({
  '@context': 'https://schema.org', '@type': 'VideoGame', name: NAME, url: SITE,
  description: page('home').description, image: SITE + 'og.jpg',
  genre: ['Endless runner', 'Arcade', 'Action'], gamePlatform: ['Web browser', 'Android (browser)', 'iOS (browser)'],
  applicationCategory: 'Game', operatingSystem: 'Any', playMode: 'SinglePlayer', inLanguage: 'en', isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  potentialAction: { '@type': 'PlayAction', target: SITE + 'play/' },
});

const pageHead = (p: Page) => `<div class="page-head"><div class="wrap"><p class="crumbs"><a href="/">${NAME}</a> › ${esc(p.nav)}</p><h1>${esc(p.h1)}</h1><p>${esc(p.lead)}</p></div></div>`;
const playBand = (h: string) => `<div class="band"><div><h2>${esc(h)}</h2><p style="margin:6px 0 0">${esc(COMMON.no_download)}</p></div><a class="btn" href="/play/">${COMMON.play}</a></div>`;
const img = (n: string, alt: string, w: number, h: number, lazy = true) => `<img src="${art(n)}" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ''} decoding="async" />`;
const controlsTable = () => `<table><thead><tr><th>Action</th><th>Phone / tablet</th><th>Keyboard</th></tr></thead><tbody>${HOME.controls.map(([a, t, k]) => `<tr><td>${esc(a)}</td><td>${esc(t)}</td><td>${esc(k)}</td></tr>`).join('')}</tbody></table>`;
const powerCards = () => `<div class="grid g4 power">${HOME.power.map(([n, h, t]) => `<div class="card">${img(n, h, 72, 72)}<h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div>`;

function home() {
  const p = page('home');
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: HOME.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const body = `${top('home')}
<div class="hero"><div class="wrap">
<div><h1>${NAME}</h1><p class="lead">${esc(p.lead)}</p><a class="btn" href="/play/">${COMMON.play}</a><p class="note">${esc(COMMON.no_download)}</p>
<ul class="feat">${HOME.features.map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join('')}</ul></div>
<div><img class="poster" src="${art('key_poster')}" alt="Marm the fox courier runs across the rooftops of Lanternfall with a bag of noodles, raccoons behind him" width="893" height="1600" fetchpriority="high" /></div>
</div></div>
<main class="wrap">
<section id="story"><h2>${esc(HOME.story_h2)}</h2><div class="grid g4 story">${HOME.story.map(([n, t], i) => `<figure class="card" style="margin:0">${img(n, `Story panel ${i + 1}`, 720, 1290)}<figcaption><p>${esc(t)}</p></figcaption></figure>`).join('')}</div></section>
<section id="how"><h2>${esc(HOME.how_h2)}</h2><p class="prose">${esc(HOME.how_p)}</p>${controlsTable()}<p><a href="/how-to-play/">Full guide: rules, obstacles and power-ups →</a></p></section>
<section id="districts"><h2>${esc(HOME.districts_h2)}</h2><p class="prose">${esc(HOME.districts_p)}</p><div class="grid g3 wide">${HOME.districts.map(([n, h, t]) => `<div class="card">${img(n, `${h} district of Lanternfall`, 1280, 714)}<h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div><p><a href="/districts/">More about the districts →</a></p></section>
<section id="power"><h2>${esc(HOME.power_h2)}</h2>${powerCards()}</section>
<section id="cast"><h2>${esc(HOME.cast_h2)}</h2><div class="grid g3 cast">${HOME.cast.map(([n, h, t]) => `<div class="card">${img(n, h, 640, 640)}<h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div><p><a href="/characters/">Meet the whole cast →</a></p></section>
<section id="gags"><h2>${esc(HOME.gags_h2)}</h2><p class="prose">${esc(HOME.gags_p)}</p><div class="grid g3 wide">${HOME.gags.map((n) => `<div class="card" style="padding:8px">${img(n, 'A cutaway gag from Takeout Fox', 1024, 637)}</div>`).join('')}</div></section>
<section id="board"><h2>${esc(HOME.board_h2)}</h2><p class="prose">${esc(HOME.board_p)} <a href="/tips/">Tips for a high score →</a></p></section>
<section id="faq" class="faq"><h2>Frequently asked questions</h2>${HOME.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
${playBand('Ready to run?')}
</main>
${foot()}`;
  return { head: head(p, [gameLd(), faqLd]), body };
}

function how() {
  const p = page('how');
  const howLd = { '@context': 'https://schema.org', '@type': 'HowTo', name: p.h1, description: p.description, step: HOME.controls.map(([a, t, k]) => ({ '@type': 'HowToStep', name: a, text: `${t} on a phone or tablet; ${k} on a keyboard.` })) };
  const body = `${top('how')}${pageHead(p)}<main class="wrap">
<section id="${HOW.sections[0].id}"><h2>${esc(HOW.sections[0].h2)}</h2><p class="prose">${esc(HOW.sections[0].body)}</p>${controlsTable()}</section>
${HOW.sections.slice(1).map((s) => `<section id="${s.id}"><h2>${esc(s.h2)}</h2><p class="prose">${esc(s.body)}</p></section>`).join('')}
<section id="obstacles"><h2>${esc(HOW.obstacles_h2)}</h2><div class="grid g2">${HOW.obstacles.map(([h, t]) => `<div class="card"><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div></section>
<section id="power"><h2>${esc(HOW.power_h2)}</h2>${powerCards()}</section>
<section id="speed"><h2>${esc(HOW.speed_h2)}</h2><p class="prose">${esc(HOW.speed_p)}</p><p>Next: <a href="/tips/">tips for a high score</a> · <a href="/districts/">the three districts</a></p></section>
${playBand('Try it now')}</main>${foot()}`;
  return { head: head(p, [crumbsLd(p), howLd]), body };
}

function districts() {
  const p = page('districts');
  const body = `${top('districts')}${pageHead(p)}<main class="wrap">
<section><p class="prose">${esc(DISTRICTS_PAGE.intro)}</p></section>
${DISTRICTS_PAGE.details.map(([h, t, at], i) => `<section id="d${i + 1}"><div class="grid g2" style="align-items:center"><div class="card wide" style="padding:8px">${img(HOME.districts[i][0], `${h}, a district of Lanternfall in Takeout Fox`, 1280, 714)}</div><div><h2>${esc(h)}</h2><p>${esc(t)}</p><p><b>Starts at:</b> ${esc(at)}</p></div></div></section>`).join('')}
<section><p>Read next: <a href="/how-to-play/">how to deal with each obstacle</a> · <a href="/characters/">who lives in Lanternfall</a></p></section>
${playBand('See all three districts')}</main>${foot()}`;
  return { head: head(p, [crumbsLd(p)]), body };
}

function cast() {
  const p = page('cast');
  const body = `${top('cast')}${pageHead(p)}<main class="wrap">
${CAST_PAGE.people.map(([n, h, t], i) => `<section id="c${i + 1}"><div class="grid g2 cast" style="align-items:center"><div class="card" style="padding:8px">${img(n, h, 640, 640)}</div><div><h2>${esc(h)}</h2><p>${esc(t)}</p></div></div></section>`).join('')}
<section><p>Read next: <a href="/districts/">the districts of Lanternfall</a> · <a href="/how-to-play/">how to play</a></p></section>
${playBand('Help Marm deliver')}</main>${foot()}`;
  return { head: head(p, [crumbsLd(p)]), body };
}

function tips() {
  const p = page('tips');
  const body = `${top('tips')}${pageHead(p)}<main class="wrap"><section class="prose">
<ol class="tips">${TIPS_PAGE.tips.map(([h, t]) => `<li><h3>${esc(h)}</h3><p>${esc(t)}</p></li>`).join('')}</ol>
<p>Read next: <a href="/how-to-play/">controls and rules</a> · <a href="/districts/">where the districts change</a></p></section>
${playBand('Go for a new best')}</main>${foot()}`;
  return { head: head(p, [crumbsLd(p)]), body };
}

const RENDER: Record<string, () => { head: string; body: string }> = { home, how, districts, cast, tips };
export function renderPage(id: string) { return RENDER[id](); }

export function render404() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>Page not found · ${NAME}</title><link rel="icon" type="image/png" href="/favicon.png" /><style>${CSS.replace(/\n/g, '')}</style>${BEACON}</head><body>${top('')}<div class="page-head"><div class="wrap"><h1>This rooftop doesn’t exist</h1><p>Marm took a wrong turn. The page you were looking for isn’t here.</p></div></div><main class="wrap"><section><a class="btn" href="/play/">${COMMON.play}</a> <p><a href="/">Back to the ${NAME} home page</a></p></section></main>${foot()}</body></html>`;
}

export function renderSitemap(date: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...PAGES.map((p) => url(p)), SITE + 'play/'].map((u) => `  <url><loc>${u}</loc><lastmod>${date}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}
export const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}sitemap.xml\n`;
