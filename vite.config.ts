import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { render404, renderPage, renderSitemap, ROBOTS } from './src/site/render';

/**
 * The site pages (/, /how-to-play/, ...) are plain HTML rendered at build time from
 * src/site/content.ts, so search engines read every word without running scripts.
 * The game itself lives at /play/. Also emits 404.html, sitemap.xml and robots.txt.
 */
function site(): Plugin {
  return {
    name: 'takeoutfox-site',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const id = /<!-- site:head:(\w+) -->/.exec(html)?.[1];
        if (!id) return html;
        const { head, body } = renderPage(id);
        return html.replace(/<!-- site:head:\w+ -->/, head).replace('<!-- site:body -->', body);
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '404.html', source: render404() });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(new Date().toISOString().slice(0, 10)) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: ROBOTS });
    },
  };
}

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Served from the domain root (takeoutfox.com), so asset paths are absolute.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [site()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // tools/build_portal.mjs: just the game, from a generated index.portal.html
      input: process.env.TF_PORTAL_BUILD ? { index: page('./index.portal.html') } : {
        home: page('./index.html'),
        play: page('./play/index.html'),
        how: page('./how-to-play/index.html'),
        districts: page('./districts/index.html'),
        characters: page('./characters/index.html'),
        tips: page('./tips/index.html'),
        subway: page('./games-like-subway-surfers/index.html'),
        runner: page('./endless-runner-games/index.html'),
        fox: page('./fox-games/index.html'),
        privacy: page('./privacy/index.html'),
        terms: page('./terms/index.html'),
      },
    },
  },
});
