import { getSql, type Sql } from './db';

/**
 * Failed-login throttling for the admin portal.
 *
 * The login page signs in through `auth.api.signInEmail()` rather than Better
 * Auth's HTTP handler. Better Auth's own rate limiter is router middleware, so
 * it never runs on that path — without this module the form is an unthrottled
 * password oracle against a single, publicly known account.
 *
 * Attempts live in Postgres rather than in memory because each serverless
 * invocation gets its own process: an in-memory counter would reset constantly
 * and bound nothing.
 */

/** How far back failures are counted, and how long a lockout lasts. */
const WINDOW_MINUTES = 15;

/** Failures allowed per email address before that account stops accepting logins. */
const MAX_PER_EMAIL = 10;

/** Failures allowed per client IP, across every email address it tries. */
const MAX_PER_IP = 20;

let ensured = false;

/**
 * Creates the table on first use. There is no migration runner in this project,
 * so the schema is applied lazily; `if not exists` makes it a no-op on every
 * call after the first in a given process.
 */
async function ensureTable(sql: Sql): Promise<void> {
  if (ensured) return;

  await sql`
    create table if not exists login_attempts (
      id bigserial primary key,
      identifier text not null,
      attempted_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists login_attempts_lookup
      on login_attempts (identifier, attempted_at desc)
  `;

  ensured = true;
}

/**
 * Identifiers a single attempt counts against. Email is the identifier that
 * matters — it can't be spoofed, and this is a single-account portal — while
 * the IP limit bounds someone spraying many addresses.
 */
function identifiersFor(email: string, ip: string | null): string[] {
  const identifiers: string[] = [];
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail) identifiers.push(`email:${normalizedEmail}`);
  if (ip) identifiers.push(`ip:${ip}`);

  return identifiers;
}

function limitFor(identifier: string): number {
  return identifier.startsWith('email:') ? MAX_PER_EMAIL : MAX_PER_IP;
}

export interface ThrottleVerdict {
  blocked: boolean;
  /** Minutes until the lockout lifts, rounded up. Zero when not blocked. */
  retryAfterMinutes: number;
}

const ALLOWED: ThrottleVerdict = { blocked: false, retryAfterMinutes: 0 };

/**
 * Reports whether this email/IP pair has burned through its attempts.
 *
 * Throws if the database is unreachable. Callers must treat that as "blocked":
 * a request that can't be counted can't be verified either, since the password
 * check reads the same database.
 */
export async function checkLoginThrottle(
  email: string,
  ip: string | null
): Promise<ThrottleVerdict> {
  const identifiers = identifiersFor(email, ip);
  if (identifiers.length === 0) return ALLOWED;

  const sql = getSql();
  await ensureTable(sql);

  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const rows = await sql`
    select identifier, count(*)::int as failures, max(attempted_at) as last_at
    from login_attempts
    where identifier = any(${identifiers}::text[])
      and attempted_at > ${cutoff}
    group by identifier
  `;

  let blockedUntil = 0;

  for (const row of rows) {
    if (row.failures < limitFor(row.identifier)) continue;

    // The lockout runs a full window past the most recent recorded failure,
    // rather than lifting one attempt at a time as individual rows age out of
    // the window. Attempts made while locked out aren't recorded, so a
    // continuing attacker doesn't extend their own lockout either.
    const lastAt = new Date(row.last_at).getTime();
    blockedUntil = Math.max(blockedUntil, lastAt + WINDOW_MINUTES * 60_000);
  }

  if (blockedUntil <= Date.now()) return ALLOWED;

  return {
    blocked: true,
    retryAfterMinutes: Math.max(
      1,
      Math.ceil((blockedUntil - Date.now()) / 60_000)
    ),
  };
}

/** Records one failure against both the email and the IP. */
export async function recordFailedLogin(
  email: string,
  ip: string | null
): Promise<void> {
  const identifiers = identifiersFor(email, ip);
  if (identifiers.length === 0) return;

  const sql = getSql();
  await ensureTable(sql);

  await sql`
    insert into login_attempts (identifier)
    select unnest(${identifiers}::text[])
  `;

  // Opportunistic housekeeping: rows outside the window can never affect a
  // verdict, and this is the only writer, so there is nowhere else to prune.
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  await sql`delete from login_attempts where attempted_at <= ${cutoff}`;
}

/** Clears the counters after a successful sign-in. */
export async function clearLoginAttempts(
  email: string,
  ip: string | null
): Promise<void> {
  const identifiers = identifiersFor(email, ip);
  if (identifiers.length === 0) return;

  const sql = getSql();
  await ensureTable(sql);

  await sql`delete from login_attempts where identifier = any(${identifiers}::text[])`;
}
