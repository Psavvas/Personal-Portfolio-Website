import type { APIRoute } from 'astro';
import { renderMarkdown } from '../../../lib/markdown';

// Renders Markdown with the exact pipeline the public site uses, so the
// admin editor preview matches the published result. Auth is enforced by
// the /admin middleware.
export const POST: APIRoute = async ({ request }) => {
  let markdown = '';

  try {
    const body = await request.json();
    if (typeof body?.markdown === 'string') {
      markdown = body.markdown;
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ html: renderMarkdown(markdown) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
