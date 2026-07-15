import 'dotenv/config';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://paulsavvas.me',
  // Server output: content pages read from Neon Postgres on each request, so
  // edits made in the /admin portal appear immediately without a rebuild.
  // Pages that never touch the database opt back in to prerendering with
  // `export const prerender = true`.
  output: 'server',
  adapter: vercel(),
  // Preserve Astro v6 whitespace handling. In v7 the default changed to
  // `'jsx'`, which strips whitespace between inline elements; `true` keeps
  // the HTML-aware compression so rendered output is unchanged by the upgrade.
  compressHTML: true,
  integrations: [react(), mdx()],
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
