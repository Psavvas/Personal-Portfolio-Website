import { Client } from '@notionhq/client';

let redirectsPromise: Promise<Record<string, string>> | null = null;

function getEnvValue(keys: string[]): string | undefined {
  const astroEnv = ((import.meta as any).env ?? {}) as Record<string, unknown>;

  for (const key of keys) {
    const astroValue = astroEnv[key];
    if (typeof astroValue === 'string' && astroValue.trim()) {
      return astroValue.trim();
    }

    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return undefined;
}

function getNotionClient(apiKey: string) {
  return new Client({ auth: apiKey });
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
    case 'url':
      return property.url?.trim() || undefined;
    case 'select':
      return property.select?.name?.trim() || undefined;
    case 'formula':
      return property.formula?.type === 'string'
        ? property.formula.string?.trim() || undefined
        : undefined;
    default:
      return undefined;
  }
}

function normalizeSlug(rawSlug: string): string {
  return rawSlug.trim().replace(/^\/+/, '').toLowerCase();
}

function normalizeDestination(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return '';

  if (url.startsWith('/')) {
    return url;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) {
    return url;
  }

  return `https://${url}`;
}

async function queryRedirectPages(
  notion: Client,
  databaseId: string,
  startCursor?: string
): Promise<any> {
  try {
    return await notion.dataSources.query({
      data_source_id: databaseId,
      start_cursor: startCursor,
      page_size: 100,
    });
  } catch {
    const legacyDatabases = (notion as any).databases;
    if (legacyDatabases?.query) {
      return await legacyDatabases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100,
      });
    }

    throw new Error('Notion client does not support redirect database querying.');
  }
}

async function loadNotionRedirects(): Promise<Record<string, string>> {
  const apiKey = getEnvValue(['NOTION_API_KEY', 'NOTION_TOKEN', 'NOTION_SECRET']);
  const databaseId = getEnvValue([
    'NOTION_REDIRECT_DB_ID',
    'NOTION_REDIRECTS_DB_ID',
    'NOTION_REDIRECT_DATABASE_ID',
  ]);

  if (!apiKey || !databaseId) {
    return {};
  }

  const notion = getNotionClient(apiKey);
  const redirects: Record<string, string> = {};
  let startCursor: string | undefined;

  try {
    do {
      const response = await queryRedirectPages(notion, databaseId, startCursor);

      for (const page of response.results) {
        if (page.object !== 'page') continue;

        const slugRaw = getPropertyText(page, 'slug') ?? getPropertyText(page, 'Slug');
        const url =
          getPropertyText(page, 'URL') ??
          getPropertyText(page, 'Url') ??
          getPropertyText(page, 'url');

        if (!slugRaw || !url) continue;

        const slug = normalizeSlug(slugRaw);
        const destination = normalizeDestination(url);
        if (!slug) continue;
        if (!destination) continue;

        redirects[slug] = destination;
      }

      startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (startCursor);

    return redirects;
  } catch (error) {
    console.warn('Failed to load Notion redirects; using static shortlinks only.', error);
    return {};
  }
}

export async function getNotionRedirectMap(): Promise<Record<string, string>> {
  if (!redirectsPromise) {
    redirectsPromise = loadNotionRedirects();
  }

  return redirectsPromise;
}
