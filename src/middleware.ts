import { defineMiddleware } from 'astro:middleware';
import { getAdminSession } from './lib/auth';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/setup']);

function normalize(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = normalize(context.url.pathname);

  // Sign-up is never available over HTTP: the single owner account is created
  // through /admin/setup, which calls Better Auth server-side.
  if (pathname.startsWith('/api/auth/sign-up')) {
    return new Response(JSON.stringify({ error: 'Sign-up is disabled.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!pathname.startsWith('/admin')) {
    return next();
  }

  const session = await getAdminSession(context.request);
  context.locals.admin = session;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    if (session && context.request.method === 'GET') {
      return context.redirect('/admin');
    }
    return next();
  }

  if (!session) {
    if (pathname.startsWith('/admin/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return context.redirect(
      `/admin/login?next=${encodeURIComponent(pathname)}`
    );
  }

  return next();
});
