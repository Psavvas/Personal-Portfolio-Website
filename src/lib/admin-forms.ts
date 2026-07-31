import type { BlogPostInput } from './blog';
import type { ProjectInput } from './projects';

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

function optionalText(form: FormData, key: string): string | undefined {
  const value = text(form, key);
  return value || undefined;
}

function checkbox(form: FormData, key: string): boolean {
  return form.get(key) === 'on';
}

function visibility(form: FormData): 'draft' | 'published' {
  return form.get('visibility') === 'published' ? 'published' : 'draft';
}

export function parseProjectForm(form: FormData): ProjectInput {
  const title = text(form, 'title');
  if (!title) {
    throw new Error('Title is required.');
  }

  const projectPage = checkbox(form, 'projectPage');
  let slug = slugify(text(form, 'slug'));
  if (!slug && projectPage) {
    slug = slugify(title);
  }
  if (projectPage && !slug) {
    throw new Error('A slug is required when the project has its own page.');
  }

  return {
    title,
    summary: text(form, 'summary'),
    slug: slug || undefined,
    tags: parseTags(text(form, 'tags')),
    year: optionalText(form, 'year'),
    featured: checkbox(form, 'featured'),
    aiBuilt: checkbox(form, 'aiBuilt'),
    projectPage,
    projectInfoUrl: optionalText(form, 'projectInfoUrl'),
    featuredBlog: optionalText(form, 'featuredBlog'),
    bodyMd: String(form.get('bodyMd') ?? ''),
    visibility: visibility(form),
  };
}

export function parseBlogPostForm(form: FormData): BlogPostInput {
  const title = text(form, 'title');
  if (!title) {
    throw new Error('Title is required.');
  }

  const slug = slugify(text(form, 'slug')) || slugify(title);
  if (!slug) {
    throw new Error('A slug is required.');
  }

  const dateIso = text(form, 'dateIso');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error('A publish date is required.');
  }

  return {
    title,
    slug,
    summary: text(form, 'summary'),
    dateIso,
    tags: parseTags(text(form, 'tags')),
    featuredProjectSlug: optionalText(form, 'featuredProjectSlug'),
    bodyMd: String(form.get('bodyMd') ?? ''),
    visibility: visibility(form),
  };
}

/** Turns Postgres constraint errors into messages safe to show in the form. */
export function friendlyDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('duplicate key')) {
    return 'That slug is already in use — pick a different one.';
  }

  return message;
}
