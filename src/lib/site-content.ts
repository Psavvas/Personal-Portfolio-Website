import { getSql } from './db';
import { renderMarkdown } from './markdown';

const NOW_KEY = 'now';

/**
 * HTML for the "Now" section on /about. Returns '' when unavailable so the
 * page can fall back to its static copy.
 */
export async function getNowSectionHtml(): Promise<string> {
  try {
    const sql = getSql();
    const rows = await sql`
      select body_md from site_content where key = ${NOW_KEY} limit 1
    `;
    if (rows.length === 0) return '';
    return renderMarkdown(rows[0].body_md ?? '');
  } catch (error) {
    console.warn(
      'Failed to load "Now" section from the database; using fallback copy.',
      error
    );
    return '';
  }
}

// ---------------------------------------------------------------------------
// Admin portal queries
// ---------------------------------------------------------------------------

export async function adminGetNowMarkdown(): Promise<string> {
  const sql = getSql();
  const rows = await sql`
    select body_md from site_content where key = ${NOW_KEY} limit 1
  `;
  return rows.length > 0 ? (rows[0].body_md ?? '') : '';
}

export async function adminSaveNowMarkdown(bodyMd: string): Promise<void> {
  const sql = getSql();
  await sql`
    insert into site_content (key, body_md)
    values (${NOW_KEY}, ${bodyMd})
    on conflict (key) do update set body_md = excluded.body_md
  `;
}
