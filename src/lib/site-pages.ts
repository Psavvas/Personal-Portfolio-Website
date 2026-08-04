import { adminListBlogPosts } from './blog';
import { adminListProjects } from './projects';

export interface PageOption {
  path: string;
  label: string;
}

export interface PageGroup {
  heading: string;
  options: PageOption[];
}

const STATIC_PAGES: PageOption[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/projects', label: 'Projects index' },
  { path: '/blog', label: 'Blog index' },
  { path: '/contact', label: 'Contact' },
];

/**
 * Every page a banner can be pinned to, grouped for the admin picker.
 * Drafts are included so a banner can be prepared before publishing.
 */
export async function getSitePageGroups(): Promise<PageGroup[]> {
  const [projects, posts] = await Promise.all([
    adminListProjects().catch(() => []),
    adminListBlogPosts().catch(() => []),
  ]);

  return [
    { heading: 'Pages', options: STATIC_PAGES },
    {
      heading: 'Projects',
      options: projects
        .filter((project) => project.projectPage && project.slug)
        .map((project) => ({
          path: `/projects/${project.slug}`,
          label: project.title,
        })),
    },
    {
      heading: 'Blog posts',
      options: posts.map((post) => ({
        path: `/blog/${post.slug}`,
        label: post.title,
      })),
    },
  ];
}
