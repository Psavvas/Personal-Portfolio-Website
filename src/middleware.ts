import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated } from './lib/admin-auth';

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/admin')) {
    return next();
  }

  const isLoginPage =
    pathname === '/admin/login' || pathname === '/admin/login/';
  const authed = isAuthenticated(context.cookies);

  if (isLoginPage) {
    if (authed && context.request.method === 'GET') {
      return context.redirect('/admin');
    }
    return next();
  }

  if (!authed) {
    if (pathname.startsWith('/admin/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const nextPath = encodeURIComponent(pathname);
    return context.redirect(`/admin/login?next=${nextPath}`);
  }

  return next();
});
