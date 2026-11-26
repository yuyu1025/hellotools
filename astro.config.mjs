import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hellotools.distinctive.fun',
  output: 'static',
  // Cloudflare Pages always serves /path/index.html at /path/ and 308-redirects
  // the slashless form, so links have to match it or every click costs a hop.
  trailingSlash: 'always',
  compressHTML: true,
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // 3496 个详情页各自都值得收录，但 404 和 JSON 索引不必进 sitemap。
      filter: (page) => !page.endsWith('/404') && !page.includes('index.json'),
      serialize(item) {
        if (item.url.includes('/t/')) {
          return { ...item, changefreq: 'weekly', priority: 0.6 };
        }
        if (item.url === 'https://hellotools.distinctive.fun/') {
          return { ...item, changefreq: 'daily', priority: 1.0 };
        }
        return { ...item, changefreq: 'daily', priority: 0.8 };
      },
    }),
  ],
});
