import {
  getProjectDestination,
  getPublishedProjects,
} from '../lib/notion-projects';
import { getPublishedBlogPosts } from '../lib/notion-blog';

interface SearchIndexItem {
  type: 'page' | 'project' | 'blog';
  title: string;
  description: string;
  url: string;
  external: boolean;
  tags: string[];
  meta: string;
}

const staticPages: SearchIndexItem[] = [
  {
    type: 'page',
    title: 'Home',
    description: 'Student engineer building practical tools.',
    url: '/',
    external: false,
    tags: [],
    meta: '',
  },
  {
    type: 'page',
    title: 'About',
    description: 'Who I am, what I care about, and what I work on.',
    url: '/about',
    external: false,
    tags: ['now', 'values', 'bio'],
    meta: '',
  },
  {
    type: 'page',
    title: 'Projects',
    description: 'Software, hardware, and 3D design work.',
    url: '/projects',
    external: false,
    tags: [],
    meta: '',
  },
  {
    type: 'page',
    title: 'Blog',
    description: 'Project notes, lessons learned, and build write-ups.',
    url: '/blog',
    external: false,
    tags: ['posts', 'writing'],
    meta: '',
  },
  {
    type: 'page',
    title: 'Contact',
    description: 'Email, contact form, and social profiles.',
    url: '/contact',
    external: false,
    tags: ['email', 'linkedin', 'github'],
    meta: '',
  },
];

export async function GET() {
  const [projects, posts] = await Promise.all([
    getPublishedProjects(),
    getPublishedBlogPosts(),
  ]);

  const projectItems: SearchIndexItem[] = projects.map((project) => {
    const destination = getProjectDestination(project);
    return {
      type: 'project' as const,
      title: project.title,
      description: project.summary,
      url: destination?.url ?? '/projects',
      external: destination?.external ?? false,
      tags: project.tags,
      meta: project.year?.trim() ?? '',
    };
  });

  const blogItems: SearchIndexItem[] = posts.map((post) => ({
    type: 'blog' as const,
    title: post.title,
    description: post.summary,
    url: `/blog/${post.slug}`,
    external: false,
    tags: post.tags,
    meta: post.date,
  }));

  return new Response(
    JSON.stringify({ items: [...staticPages, ...projectItems, ...blogItems] }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
