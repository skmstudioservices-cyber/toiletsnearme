import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://toiletsnearme.pages.dev',
  output: 'static',
  integrations: [
    sitemap({
      // internal console must never enter the sitemap
      filter: (page) => !page.includes('/themes'),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  build: { inlineStylesheets: 'auto' },
});
