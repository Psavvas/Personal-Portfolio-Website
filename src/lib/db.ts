import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

/**
 * Tagged-template SQL client: sql`select … ${value}` resolves to the rows.
 *
 * Neon's HTTP driver is used for Neon connection strings (one round trip per
 * query, ideal on serverless). Any other Postgres URL falls back to a `pg`
 * pool, which is what makes running against a local Postgres possible.
 */
export type Sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<any[]>;

let cachedSql: Sql | null = null;
let cachedUrl: string | null = null;
let cachedPool: Pool | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL is missing. Set it to your Neon Postgres connection string ' +
        '(Neon console → your project → "Connection string").'
    );
  }
  return url;
}

function isNeonUrl(url: string): boolean {
  try {
    return /(^|\.)neon\.tech$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function createPgSql(url: string): Sql {
  cachedPool?.end().catch(() => {});
  cachedPool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  const pool = cachedPool;

  return async (strings, ...values) => {
    const text = strings.reduce(
      (query, part, index) =>
        query + part + (index < values.length ? `$${index + 1}` : ''),
      ''
    );
    const result = await pool.query(text, values);
    return result.rows;
  };
}

export function getSql(): Sql {
  const url = getDatabaseUrl();

  if (!cachedSql || cachedUrl !== url) {
    cachedSql = isNeonUrl(url)
      ? (neon(url) as unknown as Sql)
      : createPgSql(url);
    cachedUrl = url;
  }

  return cachedSql;
}
