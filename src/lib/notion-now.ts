import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';

let nowSectionPromise: Promise<string> | null = null;

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

function getNowPageId(): string | undefined {
  return getEnvValue([
    'NOTION_NOW_PAGE_ID',
    'NOTION_NOW_PAGE',
    'NOTION_NOW_ID',
    'NOTION_CURRENT_PROJECT_PAGE_ID',
  ]);
}

async function loadNowSectionHtml(): Promise<string> {
  const apiKey = getEnvValue(['NOTION_API_KEY', 'NOTION_TOKEN', 'NOTION_SECRET']);
  const pageId = getNowPageId();

  if (!apiKey || !pageId) {
    return '';
  }

  try {
    const notion = getNotionClient(apiKey);
    const converter = new NotionToMarkdown({ notionClient: notion });

    const mdBlocks = await converter.pageToMarkdown(pageId);
    const mdString = converter.toMarkdownString(mdBlocks).parent?.trim() ?? '';

    if (!mdString) {
      return '';
    }

    return (marked.parse(mdString, { async: false }) as string).trim();
  } catch (error) {
    console.warn('Failed to load Notion now section; using fallback copy.', error);
    return '';
  }
}

function getNowSectionPromise(): Promise<string> {
  if (!nowSectionPromise) {
    nowSectionPromise = loadNowSectionHtml();
  }

  return nowSectionPromise;
}

export async function getNowSectionHtml(): Promise<string> {
  return getNowSectionPromise();
}