// Short-link destinations keyed by slug.
// Values starting with "/" are treated as same-origin paths.
export const shortlinks: Record<string, string> = {
  infantguard: '/projects/infantguard',
  contact: 'https://psavvas.notion.site/15770b9af471809da736d4e77a090ce0',
  linkedin: 'https://www.linkedin.com/in/pauldsavvas',
  gravatar: 'https://www.gravatar.com/avatar/paulsavvas',
  github: 'https://github.com/psavvas',
  thingiverse: 'https://www.thingiverse.com/psavvas',
  savvas3dprinting: 'https://psavvas.notion.site/savvas-3d-printing',
  notion: 'https://www.notion.com/@paulsavvas',
  resume: 'https://1drv.ms/b/c/ee91ca8e4e8d70e0/IQBnww0L4qKBT7mxoaeF_nfsAZG_na-FP1AFykMiiQpW_XM?e=qrSlXL',
};

// Project catalogue used by the projects listing page.
export interface CatalogueEntry {
  title: string;
  summary: string;
  tags: string[];
  year?: string[];
  featured?: boolean;
  repo?: string;
  link?: { label: string; href: string };
  projectPage?: string;
}

export const catalogue: CatalogueEntry[] = [
  {
    title: 'InfantGuard',
    summary:
      'Infant Guard is a fully integrated, Arduino-driven safety platform engineered to detect forgotten infants in vehicles and escalate alerts before temperatures reach life-threatening levels.',
    tags: ['Arduino', 'IoT', 'Safety', 'Hardware'],
    year: ['2026'],
    featured: true,
    projectPage: 'infantguard',
  },
  {
    title: 'Personal Portfolio Website',
    summary:
      'This website! Built with Astro and Tailwind CSS, it showcases my projects, skills, and contact information in a clean and modern design.',
    tags: ['Astro', 'Tailwind CSS', 'Portfolio'],
    year: ['2025'],
    featured: false,
    repo: 'psavvas/personal-portfolio-website',
  },
  {
    title: 'Daily Digest',
    summary:
      'DailyDigest is a Python application that automatically generates and sends a daily summary email containing your upcoming calendar events, reminders, local weather, and a motivational quote.',
    tags: ['Productivity', 'Coding', 'Python Scripts'],
    year: ['2025'],
    featured: true,
    repo: 'psavvas/daily-digest',
  },
  {
    title: 'MoleMini',
    summary:
      'Mole Mini is an all-in-one chemistry computer helping with complex calculations and conversions, created by myself and Connor Denihan in 2025.',
    tags: ['Microcomputer', 'Chemistry', 'Education'],
    year: ['2025'],
    featured: false,
    repo: 'cdenihan/mole-day-project',
  },
  {
    title: 'Notion Templates',
    summary:
      'A series of high-quality Notion templates designed to enhance productivity and organization, free for personal and professional use. Ranging from team hubs to personal planners.',
    tags: ['Productivity', 'Lifestyle', 'Notion'],
    year: ['2025'],
    featured: true,
    projectPage: 'notion-templates',
  },
  {
    title: '3D Printing for Shock Absorption',
    summary:
      'A 1st place Science Fair project investigating how different infills could affect the shock absorption properties of different objects, through research and custom infills.',
    tags: ['3D Printing', 'Science Fair', 'Research'],
    year: ['2024'],
    featured: true,
    projectPage: '3d-printing-shock-absorption',
  },
  {
    title: 'Aircraft Cabin Redesign',
    summary:
      'A recreational project, aiming to redesign aircraft cabin and airline seating for improved comfort and functionality, through 3D modeling.',
    tags: ['3D Printing', 'CAD', 'Aviation'],
    year: ['2024'],
    featured: false,
    projectPage: 'aircraft-cabin-redesign',
  },
];
