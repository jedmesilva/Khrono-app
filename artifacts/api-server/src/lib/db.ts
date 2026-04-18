import pg from "pg";

const { Pool } = pg;

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required.");
}

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<T>(text, params);
}