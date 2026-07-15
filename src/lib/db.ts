import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

let cachedSql: Sql | null = null;
let cachedUrl: string | null = null;

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

/** Tagged-template SQL client backed by Neon's serverless HTTP driver. */
export function getSql(): Sql {
  const url = getDatabaseUrl();
  if (!cachedSql || cachedUrl !== url) {
    cachedSql = neon(url);
    cachedUrl = url;
  }
  return cachedSql;
}
