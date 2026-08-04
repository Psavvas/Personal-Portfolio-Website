import type { APIRoute } from 'astro';
import { renderBannerMarkdown, renderMarkdown } from '../../../lib/markdown';

// Renders Markdown with the exact pipeline the public site uses, so the
// admin editor preview matches the published result. Auth is enforced by
// the /admin middleware.
export const POST: APIRoute = async ({ request }) => {
  let markdown = '';
  let mode = 'content';

  try {
    const body = await request.json();
    if (typeof body?.markdown === 'string') {
      markdown = body.markdown;
    }
    if (body?.mode === 'banner') {
      mode = 'banner';
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const html =
    mode === 'banner'
      ? renderBannerMarkdown(markdown)
      : renderMarkdown(markdown);

  return new Response(JSON.stringify({ html }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
