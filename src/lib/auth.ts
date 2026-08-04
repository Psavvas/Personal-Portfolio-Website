import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { getSql } from './db';

// Better Auth, backed by the same Neon Postgres database as the site
// content. Users, sessions, and accounts live in the `user`, `session`,
// `account`, and `verification` tables.
//
// The instance is built lazily so a missing DATABASE_URL / BETTER_AUTH_SECRET
// surfaces as a friendly setup message rather than crashing the whole site
// at module load.

let cachedAuth: Auth | null = null;
let cachedAuthKey = '';
let cachedPool: Pool | null = null;
let cachedPoolKey = '';

/** Placeholder values from .env.example, which must never reach production. */
const PLACEHOLDER_SECRETS = new Set([
  'change-me',
  'changeme',
  'secret',
  'your-secret-here',
]);

const MIN_SECRET_LENGTH = 32;

export function getAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET?.trim() ?? '';
}

/**
 * A secret is only usable if it is present, isn't a copied-in placeholder, and
 * is long enough to be worth signing with. A portal that boots on `change-me`
 * looks configured while being anything but.
 */
function getSecretError(): string {
  const secret = getAuthSecret();

  if (!secret) return 'Missing environment variable: BETTER_AUTH_SECRET.';

  if (PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    return 'BETTER_AUTH_SECRET is still set to a placeholder value. Generate a real one with `openssl rand -base64 32`.';
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    return `BETTER_AUTH_SECRET is too short — it must be at least ${MIN_SECRET_LENGTH} characters. Generate one with \`openssl rand -base64 32\`.`;
  }

  return '';
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && !getSecretError();
}

/** Human-readable reason the admin portal can't authenticate anyone yet. */
export function getAuthConfigError(): string {
  const problems: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    problems.push('Missing environment variable: DATABASE_URL.');
  }

  const secretError = getSecretError();
  if (secretError) problems.push(secretError);

  return problems.join(' ');
}

function getPool(connectionString: string): Pool {
  if (!cachedPool || cachedPoolKey !== connectionString) {
    cachedPool?.end().catch(() => {});
    cachedPool = new Pool({
      connectionString,
      // Neon terminates TLS with a publicly trusted certificate, so normal
      // verification applies. A local Postgres (dev) speaks plaintext.
      ssl: isLocalHost(connectionString) ? false : true,
      // Serverless invocations are short-lived, so keep the pool small and let
      // idle connections go quickly. `max` stays above 1 because Better Auth
      // runs some writes inside a transaction while issuing other queries.
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    cachedPoolKey = connectionString;
  }
  return cachedPool;
}

function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function createAuth(connectionString: string, secret: string) {
  return betterAuth({
    database: getPool(connectionString),
    secret,
    // Left unset so Better Auth infers the origin from the incoming request.
    // That keeps sign-in working on Vercel preview deployments as well as the
    // production domain. Set BETTER_AUTH_URL to pin it to a single origin.
    ...(process.env.BETTER_AUTH_URL?.trim()
      ? { baseURL: process.env.BETTER_AUTH_URL.trim() }
      : {}),
    // Pinned to BETTER_AUTH_URL when it is set. Falling back to the origin the
    // request arrived on is only meaningful on hosts nobody else can reach —
    // the Host header is attacker-controlled on the *.vercel.app deployment
    // URL, and a self-referential check proves nothing there.
    trustedOrigins: (request) => {
      const pinned = process.env.BETTER_AUTH_URL?.trim();
      if (pinned) {
        try {
          return [new URL(pinned).origin];
        } catch {
          return [];
        }
      }

      if (!request) return [];
      try {
        return [new URL(request.url).origin];
      } catch {
        return [];
      }
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      // The portal is single-account and closed. This is the setting that
      // actually turns registration off — the previous middleware path
      // denylist only held for as long as the route string never changed.
      disableSignUp: true,
      // No mail provider is wired up, so email verification would lock the
      // only account out of the portal.
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh at most daily
    },
    databaseHooks: {
      user: {
        create: {
          // Third layer behind `disableSignUp` and the deleted HTTP handler:
          // a hard cap of one account, enforced at the write itself. Reachable
          // only through server-side `auth.api` calls, so the read-then-write
          // race it contains needs code in this repo to trigger it.
          before: async () => {
            if (await hasAnyUser()) {
              return false;
            }
          },
        },
      },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;

export function getAuth(): Auth {
  const connectionString = process.env.DATABASE_URL?.trim();
  const secret = getAuthSecret();

  if (!connectionString || !secret) {
    throw new Error(
      `The admin portal is not configured. ${getAuthConfigError()}`
    );
  }

  if (!cachedAuth || cachedAuthKey !== connectionString) {
    cachedAuth = createAuth(connectionString, secret);
    cachedAuthKey = connectionString;
  }

  return cachedAuth;
}

/** True once the owner account exists — used to close the setup flow. */
export async function hasAnyUser(): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`select 1 from "user" limit 1`;
  return rows.length > 0;
}

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
}

/**
 * Resolves the signed-in admin for a request, or null. Never throws — an
 * unconfigured or unreachable database simply means "not signed in".
 */
export async function getAdminSession(
  request: Request
): Promise<AdminSession | null> {
  if (!isAuthConfigured()) return null;

  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });

    if (!session?.user) return null;

    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  } catch (error) {
    console.error('Failed to resolve the admin session.', error);
    return null;
  }
}
