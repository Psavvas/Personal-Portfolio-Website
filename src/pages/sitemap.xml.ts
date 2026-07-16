import type { APIRoute } from 'astro';
import { getPublishedBlogPosts } from '../lib/blog';
import { getPublishedProjectPages } from '../lib/projects';

// Dynamic sitemap: project and blog routes live in the database, so the
// build-time sitemap integration can't see them.
export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.href ?? 'https://paulsavvas.com/').replace(/\/+$/, '');

  const paths = ['/', '/about', '/projects', '/blog', '/contact'];

  try {
    const [projects, posts] = await Promise.all([
      getPublishedProjectPages(),
      getPublishedBlogPosts(),
    ]);

    paths.push(...projects.map((project) => `/projects/${project.slug}`));
    paths.push(...posts.map((post) => `/blog/${post.slug}`));
  } catch (error) {
    console.warn('Sitemap: falling back to static routes only.', error);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
