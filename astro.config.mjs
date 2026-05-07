import 'dotenv/config';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paulsavvas.me',
  integrations: [react(), mdx(), sitemap()],
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: '52k1cu2hr9.ufs.sh' },
      { protocol: 'https', hostname: 'github.com' },
    ],
  },
  legacy: {
    collectionsBackwardsCompat: true,
  },
});
