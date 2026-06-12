import type { ProjectRecord } from './notion-projects';
import type { BlogPost } from './notion-blog';

/**
 * Sample content used when NOTION_MOCK=1 is set, so the site can be
 * built and previewed locally without Notion credentials. Never enable
 * this in production builds.
 */

export const mockProjects: ProjectRecord[] = [
  {
    id: 'mock-project-1',
    title: 'Peer Learning Platform',
    summary:
      'A platform that redefines how independent learners connect, collaborate, and teach one another.',
    tags: ['Software', 'TypeScript', 'Education'],
    year: '2026',
    featured: true,
    projectPage: true,
    slug: 'peer-learning-platform',
  },
  {
    id: 'mock-project-2',
    title: 'Greenhouse Monitor',
    summary:
      'An ESP32-based sensor array that tracks humidity, temperature, and soil moisture in real conditions.',
    tags: ['Hardware', 'ESP32', 'Sensors'],
    year: '2025',
    featured: true,
    projectPage: true,
    slug: 'greenhouse-monitor',
  },
  {
    id: 'mock-project-3',
    title: 'Parametric Cable Organizer',
    summary:
      'A fully parametric 3D-printed cable management system designed in Fusion 360.',
    tags: ['3D Design', 'Fusion 360'],
    year: '2025',
    featured: true,
    projectPage: false,
    projectInfoUrl: 'https://www.thingiverse.com/psavvas',
  },
  {
    id: 'mock-project-4',
    title: 'Homework Tracker CLI',
    summary:
      'A terminal tool that syncs assignments and due dates so nothing slips through the cracks.',
    tags: ['Software', 'CLI'],
    year: '2024',
    featured: false,
    projectPage: false,
    projectInfoUrl: 'https://github.com/psavvas',
  },
  {
    id: 'mock-project-5',
    title: 'Weather Station Mount',
    summary:
      'A weather-resistant 3D-printed mount for an outdoor sensor cluster, tested through a Maryland winter.',
    tags: ['3D Design', 'Hardware'],
    year: '2024',
    featured: false,
    projectPage: false,
    projectInfoUrl: 'https://www.thingiverse.com/psavvas',
  },
];

export const mockProjectBody = {
  topLinksHtml:
    '<div class="mt-10 flex flex-wrap gap-3"><a href="https://github.com/psavvas" target="_blank" rel="noopener noreferrer" class="site-btn hover-lift site-btn--project-primary">View on GitHub</a><a href="https://paulsavvas.me" class="site-btn hover-lift">Live demo</a></div>',
  bodyHtml:
    '<h2>Overview</h2><p>This is sample project content rendered in mock mode. The production build pulls this body from Notion.</p><h2>What I learned</h2><p>Testing assumptions early and iterating until the solution works reliably.</p><ul><li>Start with the smallest testable version.</li><li>Measure, then optimize.</li><li>Document decisions as you go.</li></ul>',
};

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'mock-post-1',
    slug: 'building-the-greenhouse-monitor',
    title: 'Building the Greenhouse Monitor',
    summary:
      'How I designed, broke, and rebuilt an ESP32 sensor array until it survived real weather.',
    date: '2026-03-14',
    tags: ['Hardware', 'Build log'],
    featuredProjectSlug: 'greenhouse-monitor',
  },
  {
    id: 'mock-post-2',
    slug: 'lessons-from-failed-prints',
    title: 'Lessons from a Pile of Failed Prints',
    summary:
      'Warped corners, stripped supports, and what each failure taught me about designing for FDM.',
    date: '2025-11-02',
    tags: ['3D Design'],
  },
  {
    id: 'mock-post-3',
    slug: 'why-i-write-things-down',
    title: 'Why I Write Things Down',
    summary:
      'Documentation is a tool for thinking, not just a record of what happened.',
    date: '2025-06-21',
    tags: ['Process'],
  },
];

export const mockBlogBodyHtml =
  '<p>This is sample blog content rendered in mock mode. The production build pulls this body from Notion.</p><h2>The setup</h2><p>Every project starts with a question worth answering.</p><blockquote><p>Progress comes from testing assumptions early.</p></blockquote><h2>The result</h2><p>A tool that keeps working when conditions change.</p>';
