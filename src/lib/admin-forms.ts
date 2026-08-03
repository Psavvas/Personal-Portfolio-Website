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

/**
 * Reads every project field from a submitted form without validating it.
 * Used to repopulate the form after an error so the editor never silently
 * loses toggles, tags, or visibility the user had just set.
 */
export function readProjectForm(form: FormData): ProjectInput {
  const projectPage = checkbox(form, 'projectPage');
  const slug = slugify(text(form, 'slug'));

  return {
    title: text(form, 'title'),
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

export function parseProjectForm(form: FormData): ProjectInput {
  const input = readProjectForm(form);

  if (!input.title) {
    throw new Error('Title is required.');
  }

  // Fall back to a slug derived from the title when the project needs a page.
  if (!input.slug && input.projectPage) {
    input.slug = slugify(input.title);
  }
  if (input.projectPage && !input.slug) {
    throw new Error('A slug is required when the project has its own page.');
  }

  return input;
}

/** Unvalidated counterpart to {@link parseBlogPostForm}, for repopulation. */
export function readBlogPostForm(form: FormData): BlogPostInput {
  return {
    title: text(form, 'title'),
    slug: slugify(text(form, 'slug')),
    summary: text(form, 'summary'),
    dateIso: text(form, 'dateIso'),
    tags: parseTags(text(form, 'tags')),
    featuredProjectSlug: optionalText(form, 'featuredProjectSlug'),
    bodyMd: String(form.get('bodyMd') ?? ''),
    visibility: visibility(form),
  };
}

export function parseBlogPostForm(form: FormData): BlogPostInput {
  const input = readBlogPostForm(form);

  if (!input.title) {
    throw new Error('Title is required.');
  }

  if (!input.slug) {
    input.slug = slugify(input.title);
  }
  if (!input.slug) {
    throw new Error('A slug is required.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateIso)) {
    throw new Error('A publish date is required.');
  }

  return input;
}

/** Turns Postgres constraint errors into messages safe to show in the form. */
export function friendlyDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('duplicate key')) {
    return 'That slug is already in use — pick a different one.';
  }

  return message;
}
