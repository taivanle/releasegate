import "server-only";
import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Supabase transaction pooler (port 6543) does not support prepared statements.
  return postgres(url, { prepare: false, max: 5, transform: postgres.camel });
}

export function db() {
  globalForDb.sql ??= createClient();
  return globalForDb.sql;
}
