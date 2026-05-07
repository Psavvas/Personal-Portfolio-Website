import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  featuredProjectSlug?: string;
  bodyHtml?: string;
}

const publishedVisibility = 'published';

let blogPostsPromise: Promise<BlogPost[]> | null = null;
const blogBodyPromises = new Map<
  string,
  Promise<string>
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
    auth: getEnvValue(['NOTION_API_KEY', 'NOTION_TOKEN', 'NOTION_SECRET'], 'Notion API key'),
  });
}

function getBlogDatabaseId() {
  return getEnvValue(
    ['NOTION_BLOG_DB_ID', 'NOTION_BLOG_DATABASE_ID', 'NOTION_DATABASE_ID'],
    'Notion blog database ID'
  );
}

function getPropertyText(page: any, propertyName: string): string | undefined {
  const property = page?.properties?.[propertyName];
  if (!property) return undefined;

  switch (property.type) {
    case 'title':
    case 'rich_text':
      return property[property.type]
        .map((item: { plain_text?: string }) => item.plain_text ?? '')
        .join('')
        .trim() || undefined;
    case 'select':
      return property.select?.name?.trim() || undefined;
    case 'url':
      return property.url?.trim() || undefined;
    case 'date':
      return property.date?.start ?? undefined;
    default:
      return undefined;
  }
}

function getTags(page: any): string[] {
  const property = page?.properties?.['Tags'];
  if (!property || property.type !== 'multi_select') return [];

  return property.multi_select
    .map((item: { name?: string }) => item.name?.trim())
    .filter((value: string | undefined): value is string => Boolean(value));
}

function isPublished(page: any): boolean {
  return (getPropertyText(page, 'Visibility') ?? '').toLowerCase() === publishedVisibility;
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

function arrangeProjectMedia(html: string): string {
  const imageFigurePattern = /<figure data-project-media="image">[\s\S]*?<\/figure>/g;
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
          .map((figure) => figure.replace('<figure data-project-media="image">', '<figure class="m-0">'))
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

function toBlogPost(page: any): BlogPost {
  const featuredProjectText = getPropertyText(page, 'Featured Project');

  return {
    id: page.id,
    slug: getPropertyText(page, 'Slug') ?? '',
    title: getPropertyText(page, 'Blog Title') ?? 'Untitled post',
    summary: getPropertyText(page, 'Description') ?? '',
    date: getPropertyText(page, 'Date') ?? '',
    tags: getTags(page),
    featuredProjectSlug: featuredProjectText || undefined,
  };
}

async function loadBlogBodyHtml(pageId: string): Promise<string> {
  const notion = getNotionClient();
  const converter = new NotionToMarkdown({ notionClient: notion });

  converter.setCustomTransformer('image', async (block: any) => {
    const imageUrl = block.image?.external?.url || block.image?.file?.url || '';
    if (!imageUrl) return '';
    return await renderMediaEmbed(imageUrl, 'Blog image');
  });

  converter.setCustomTransformer('embed', async (block: any) => {
    const embedUrl = block.embed?.url ?? '';
    if (!embedUrl) return '';

    if (isImageUrl(embedUrl) || isUploadThingUrl(embedUrl)) {
      return await renderMediaEmbed(embedUrl, 'Blog image');
    }

    return `<div class="my-8 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"><iframe src="${embedUrl}" class="aspect-video w-full" loading="lazy" allowfullscreen></iframe></div>`;
  });

  const mdBlocks = await converter.pageToMarkdown(pageId);
  const mdString = converter.toMarkdownString(mdBlocks).parent?.trim() ?? '';

  if (!mdString) {
    return '';
  }

  const renderer = {
    link(token: any) {
      const url = token.href;
      const text = formatLinkText(token.text ?? '');

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

      if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0] || '';
        if (videoId) {
          return renderVideoEmbed(`https://player.vimeo.com/video/${videoId}`);
        }
      }

      return `<a href="${url}">${text}</a>`;
    },
  };

  marked.use({ renderer });

  let html = marked.parse(mdString, { async: false }) as string;
  html = arrangeProjectMedia(html);
  return html;
}

async function loadPublishedBlogPosts(): Promise<BlogPost[]> {
  const notion = getNotionClient();
  const posts: BlogPost[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: getBlogDatabaseId(),
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    posts.push(
      ...response.results
        .filter((page): page is any => page.object === 'page')
        .filter(isPublished)
        .map(toBlogPost)
    );

    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  return posts.sort((left, right) => {
    const leftDate = new Date(left.date).getTime();
    const rightDate = new Date(right.date).getTime();
    return rightDate - leftDate;
  });
}

function getBlogPostsPromise(): Promise<BlogPost[]> {
  if (!blogPostsPromise) {
    blogPostsPromise = loadPublishedBlogPosts();
  }

  return blogPostsPromise;
}

function getBlogBodyPromise(pageId: string): Promise<string> {
  const cached = blogBodyPromises.get(pageId);
  if (cached) return cached;

  const promise = loadBlogBodyHtml(pageId);
  blogBodyPromises.set(pageId, promise);
  return promise;
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  return getBlogPostsPromise();
}

export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPost | undefined> {
  const posts = await getPublishedBlogPosts();
  const post = posts.find((item) => item.slug === slug);

  if (!post) return undefined;

  if (!post.bodyHtml) {
    post.bodyHtml = await getBlogBodyPromise(post.id);
  }

  return post;
}
