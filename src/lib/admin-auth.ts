import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'ps_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? '';
}

export function isAdminConfigured(): boolean {
  return getAdminPassword().length > 0;
}

function getSessionSecret(): string {
  // A dedicated SESSION_SECRET is optional; deriving from the admin password
  // means changing the password also invalidates existing sessions.
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) return explicit;
  return `ps-admin-session::${getAdminPassword()}`;
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function verifyPassword(input: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  return safeEqual(input, password);
}

export function createSessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_TTL_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !isAdminConfigured()) return false;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, sign(payload));
}

export function setSessionCookie(cookies: AstroCookies): void {
  cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function isAuthenticated(cookies: AstroCookies): boolean {
  return verifySessionToken(cookies.get(SESSION_COOKIE)?.value);
}
