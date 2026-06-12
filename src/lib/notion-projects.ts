import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';
import { mockProjects, mockProjectBody } from './mock-data';

export interface ProjectRecord {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  year?: string;
  featured: boolean;
  projectPage: boolean;
  slug?: string;
  projectInfoUrl?: string;
  featuredBlog?: string;
  topLinksHtml?: string;
  bodyHtml?: string;
}

export interface ProjectDestination {
  url: string;
  external: boolean;
}

const publishedVisibility = 'published';

let projectsPromise: Promise<ProjectRecord[]> | null = null;
const projectBodyPromises = new Map<
  string,
  Promise<{ bodyHtml: string; topLinksHtml: string }>
>();

function getEnvValue(keys: string[], label: string): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  throw new Error(
    `${label} is missing. Set one of these environment variables: ${keys.join(', ')}`
  );
}

function getNotionClient() {
  return new Client({
    auth: getEnvValue(
      ['NOTION_API_KEY', 'NOTION_TOKEN', 'NOTION_SECRET'],
      'Notion API key'
    ),
  });
}

function getDatabaseId() {
  return getEnvValue(
    [
      'NOTION_PROJECTS_DB_ID',
      'NOTION_DATABASE_ID',
      'NOTION_PROJECTS_DATABASE_ID',
      'NOTION_DB_ID',
    ],
    'Notion database ID'
  );
}

function getPropertyText(page: any, propertyName: string): string | undefined {
  const property = page?.properties?.[propertyName];
  if (!property) return undefined;

  switch (property.type) {
    case 'title':
    case 'rich_text':
      return (
        property[property.type]
          .map((item: { plain_text?: string }) => item.plain_text ?? '')
          .join('')
          .trim() || undefined
      );
    case 'select':
      return property.select?.name?.trim() || undefined;
    case 'url':
      return property.url?.trim() || undefined;
    default:
      return undefined;
  }
}

function getTags(page: any): string[] {
  const property = page?.properties?.['Project Attributes'];
  if (!property || property.type !== 'multi_select') return [];

  return property.multi_select
    .map((item: { name?: string }) => item.name?.trim())
    .filter((value: string | undefined): value is string => Boolean(value));
}

function getBoolean(page: any, propertyName: string): boolean {
  const property = page?.properties?.[propertyName];
  return Boolean(property?.checkbox);
}

function getProjectSortYear(year?: string): number {
  if (!year) return Number.NEGATIVE_INFINITY;

  const trimmed = year.trim();
  const yearMatch = trimmed.match(/\d{4}/);
  if (yearMatch) return Number(yearMatch[0]);

  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) return new Date(parsedDate).getUTCFullYear();

  return Number.NEGATIVE_INFINITY;
}

function isPublished(page: any): boolean {
  return (
    (getPropertyText(page, 'Visibility') ?? '').toLowerCase() ===
    publishedVisibility
  );
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(url);
}

function isUploadThingUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('ufs.sh') || hostname.includes('uploadthing.com');
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLinkText(text: string): string {
  const trimmed = text.trim();

  const boldMatch = trimmed.match(/^(\*\*|__)(.+)\1$/);
  if (boldMatch) {
    return `<strong>${escapeHtml(boldMatch[2])}</strong>`;
  }

  const italicMatch = trimmed.match(/^(\*|_)(.+)\1$/);
  if (italicMatch) {
    return `<em>${escapeHtml(italicMatch[2])}</em>`;
  }

  return escapeHtml(trimmed)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

async function renderMediaEmbed(url: string, alt: string): Promise<string> {
  const safeAlt = alt.replace(/"/g, '&quot;');

  if (!url) return '';

  return `<figure data-project-media="image"><img src="${url}" alt="${safeAlt}" loading="lazy" style="display:block;margin:0 auto;width:auto;max-width:min(100%,540px);height:auto;max-height:70vh;object-fit:contain;border-radius:0.75rem;border:1px solid rgb(229 231 235);" /></figure>`;
}

function renderVideoEmbed(url: string): string {
  return `<div class="my-8 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950 dark:border-neutral-800"><iframe src="${url}" class="aspect-video w-full" loading="lazy" style="display:block;border:0;width:100%;height:100%;" allowfullscreen></iframe></div>`;
}

function buildTopLinksHtml(html: string): string {
  const linkPattern = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const links: Array<{ href: string; label: string; external: boolean }> = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(linkPattern)) {
    const href = match[1];
    const label = match[2].trim();
    const key = `${href}|${label}`;

    if (seen.has(key)) continue;
    seen.add(key);

    let external = false;
    try {
      external = new URL(href).protocol.startsWith('http');
    } catch {
      external = false;
    }

    links.push({ href, label, external });
  }

  if (links.length === 0) return '';

  const hasMultipleLinks = links.length > 1;

  return `<div class="mt-10 flex flex-wrap gap-3">${links
    .map(
      ({ href, label, external }, index) =>
        `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} class="site-btn hover-lift ${
          hasMultipleLinks && index === 0 ? 'site-btn--project-primary' : ''
        }">${label}</a>`
    )
    .join('')}</div>`;
}

function arrangeProjectMedia(html: string): string {
  const imageFigurePattern =
    /<figure data-project-media="image">[\s\S]*?<\/figure>/g;
  const figures = html.match(imageFigurePattern);

  if (!figures || figures.length === 0) return html;

  let result = '';
  let lastIndex = 0;
  let pendingFigures: string[] = [];

  const flushPendingFigures = () => {
    if (pendingFigures.length === 0) return;

    for (let index = 0; index < pendingFigures.length; index += 2) {
      const pair = pendingFigures.slice(index, index + 2);

      if (pair.length === 2) {
        result += `<div class="my-8 grid gap-4 md:grid-cols-2 items-start">${pair
          .map((figure) =>
            figure.replace(
              '<figure data-project-media="image">',
              '<figure class="m-0">'
            )
          )
          .join('')}</div>`;
      } else {
        result += `<div class="my-8 flex justify-center">${pair[0].replace(
          '<figure data-project-media="image">',
          '<figure class="m-0">'
        )}</div>`;
      }
    }

    pendingFigures = [];
  };

  for (const match of html.matchAll(imageFigurePattern)) {
    const figure = match[0];
    const index = match.index ?? 0;
    const between = html.slice(lastIndex, index);

    if (between.trim()) {
      flushPendingFigures();
      result += between;
    } else if (pendingFigures.length === 0 && between) {
      result += between;
    }

    pendingFigures.push(figure);
    lastIndex = index + figure.length;
  }

  const tail = html.slice(lastIndex);
  if (tail.trim()) {
    flushPendingFigures();
    result += tail;
  } else {
    flushPendingFigures();
    result += tail;
  }

  return result;
}

function toProjectRecord(page: any): ProjectRecord {
  return {
    id: page.id,
    title:
      getPropertyText(page, 'Project Name') ??
      getPropertyText(page, 'Name') ??
      'Untitled project',
    summary: getPropertyText(page, 'Project Description') ?? '',
    tags: getTags(page),
    year:
      getPropertyText(page, 'Project Year') ?? getPropertyText(page, 'Year'),
    featured: getBoolean(page, 'Featured'),
    projectPage: getBoolean(page, 'Project Page'),
    slug: getPropertyText(page, 'Slug'),
    projectInfoUrl: getPropertyText(page, 'Project Info URL'),
    featuredBlog: getPropertyText(page, 'Featured Blog'),
  };
}

async function loadProjectBodyHtml(
  pageId: string
): Promise<{ bodyHtml: string; topLinksHtml: string }> {
  if (process.env.NOTION_MOCK === '1') {
    return { ...mockProjectBody };
  }

  const notion = getNotionClient();
  const converter = new NotionToMarkdown({ notionClient: notion });

  converter.setCustomTransformer('image', async (block: any) => {
    const imageUrl = block.image?.external?.url || block.image?.file?.url || '';
    if (!imageUrl) return '';
    return await renderMediaEmbed(imageUrl, 'Project image');
  });

  converter.setCustomTransformer('embed', async (block: any) => {
    const embedUrl = block.embed?.url ?? '';
    if (!embedUrl) return '';

    if (isImageUrl(embedUrl) || isUploadThingUrl(embedUrl)) {
      return await renderMediaEmbed(embedUrl, 'Project image');
    }

    return `<div class="my-8 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"><iframe src="${embedUrl}" class="aspect-video w-full" loading="lazy" allowfullscreen></iframe></div>`;
  });

  const mdBlocks = await converter.pageToMarkdown(pageId);
  const mdString = converter.toMarkdownString(mdBlocks).parent?.trim() ?? '';

  if (!mdString) {
    return {
      topLinksHtml: '',
      bodyHtml: '',
    };
  }

  // Custom renderer for links to embed videos and images
  const renderer = {
    link(token: any) {
      const url = token.href;
      const text = formatLinkText(token.text ?? '');

      // YouTube URL patterns
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (url.includes('v=')) {
          videoId = url.split('v=')[1]?.split('&')[0] || '';
        }
        if (videoId) {
          return renderVideoEmbed(`https://www.youtube.com/embed/${videoId}`);
        }
      }

      // Vimeo URL patterns
      if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0] || '';
        if (videoId) {
          return renderVideoEmbed(`https://player.vimeo.com/video/${videoId}`);
        }
      }

      // Default link rendering
      return `<a href="${url}">${text}</a>`;
    },
  };

  marked.use({ renderer });

  let html = marked.parse(mdString, { async: false }) as string;

  html = arrangeProjectMedia(html);

  const dividerIndex = html.search(/<hr\b[^>]*>/i);
  if (dividerIndex >= 0) {
    const topSection = html.slice(0, dividerIndex);
    const dividerEnd =
      html.slice(dividerIndex).match(/^<hr\b[^>]*>\s*/i)?.[0].length ?? 0;
    const bodyHtml = html.slice(dividerIndex + dividerEnd);

    return {
      topLinksHtml: buildTopLinksHtml(topSection),
      bodyHtml,
    };
  }

  return {
    topLinksHtml: '',
    bodyHtml: html,
  };
}

async function loadPublishedProjects(): Promise<ProjectRecord[]> {
  if (process.env.NOTION_MOCK === '1') {
    return mockProjects.map((project) => ({ ...project }));
  }

  const notion = getNotionClient();
  const projects: ProjectRecord[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: getDatabaseId(),
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    projects.push(
      ...response.results
        .filter((page): page is any => page.object === 'page')
        .filter(isPublished)
        .map(toProjectRecord)
    );

    startCursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (startCursor);

  return projects.sort((left, right) => {
    const leftYear = getProjectSortYear(left.year);
    const rightYear = getProjectSortYear(right.year);

    if (rightYear !== leftYear) {
      return rightYear - leftYear;
    }

    // If same year, prioritize featured projects
    if (left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
}

function getProjectsPromise(): Promise<ProjectRecord[]> {
  if (!projectsPromise) {
    projectsPromise = loadPublishedProjects();
  }

  return projectsPromise;
}

function getProjectBodyPromise(
  pageId: string
): Promise<{ bodyHtml: string; topLinksHtml: string }> {
  const cached = projectBodyPromises.get(pageId);
  if (cached) return cached;

  const promise = loadProjectBodyHtml(pageId);
  projectBodyPromises.set(pageId, promise);
  return promise;
}

export async function getPublishedProjects(): Promise<ProjectRecord[]> {
  return getProjectsPromise();
}

export async function getPublishedProjectPages(): Promise<ProjectRecord[]> {
  const projects = await getProjectsPromise();
  return projects.filter(
    (project) => project.projectPage && Boolean(project.slug)
  );
}

export async function getProjectBySlug(
  slug: string
): Promise<ProjectRecord | undefined> {
  const projects = await getPublishedProjectPages();
  const project = projects.find((item) => item.slug === slug);

  if (!project) return undefined;

  if (!project.bodyHtml) {
    const content = await getProjectBodyPromise(project.id);
    project.bodyHtml = content.bodyHtml;
    project.topLinksHtml = content.topLinksHtml;
  }

  return project;
}

export function getProjectDestination(
  project: ProjectRecord
): ProjectDestination | null {
  if (project.projectPage && project.slug) {
    return { url: `/projects/${project.slug}`, external: false };
  }

  if (!project.projectPage && project.projectInfoUrl) {
    return { url: project.projectInfoUrl, external: true };
  }

  return null;
}

export function formatProjectYear(year?: string): string | undefined {
  const value = year?.trim();
  return value ? value : undefined;
}

export function getLatestProject(
  projects: ProjectRecord[]
): ProjectRecord | undefined {
  return projects.slice().sort((a, b) => {
    const aYear = getProjectSortYear(a.year);
    const bYear = getProjectSortYear(b.year);

    if (bYear !== aYear) {
      return bYear - aYear;
    }

    // If same year, prioritize featured projects
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }

    return a.title.localeCompare(b.title);
  })[0];
}
