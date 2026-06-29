import 'dotenv/config';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://paulsavvas.me',
  // Preserve Astro v6 whitespace handling. In v7 the default changed to
  // `'jsx'`, which strips whitespace between inline elements; `true` keeps
  // the HTML-aware compression so rendered output is unchanged by the upgrade.
  compressHTML: true,
  integrations: [react(), mdx(), sitemap()],
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: '52k1cu2hr9.ufs.sh' },
      { protocol: 'https', hostname: 'github.com' },
    ],
  },
  // Tailwind v4 via the Vite plugin. Under Vite 8 (Astro 7) the PostCSS
  // approach fails to resolve `@import 'tailwindcss'`; the Vite plugin is the
  // recommended integration and handles Tailwind's CSS directives natively.
  vite: {
    plugins: [tailwindcss()],
  },
});
