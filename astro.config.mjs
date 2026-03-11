import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paulsavvas.me',
  integrations: [react(), mdx(), sitemap()],
  legacy: {
    collectionsBackwardsCompat: true,
  },
});
