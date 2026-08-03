import type { APIRoute } from 'astro';
import { getAuth, isAuthConfigured } from '../../../lib/auth';

// Better Auth's own endpoints (sign-in, sign-out, session, …).
// The sign-up route is blocked in src/middleware.ts — the owner account is
// created once through /admin/setup and never over the public API.
export const ALL: APIRoute = async ({ request }) => {
  if (!isAuthConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Authentication is not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return getAuth().handler(request);
};
