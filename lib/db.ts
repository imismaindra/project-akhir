import { Pool } from "pg";
const dburl = process.env.DATABASE_URL;
if(!dburl) {
  throw new Error("DATABASE_URL belum diset");
}

declare global {
    // eslint-disable-next-line no-var
    var __pgPool: Pool | undefined;
}

export const pool: Pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: dburl,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}