// Creates/updates the Better Auth tables (user, session, account, verification).
// Runs before `next start`; safe to run repeatedly.
import { getMigrations } from "better-auth/db/migration";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run auth migrations.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
try {
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET ?? "migration-only",
  });
  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    console.log("Auth schema is up to date.");
  } else {
    await runMigrations();
    console.log(`Auth schema migrated (${toBeCreated.length} created, ${toBeAdded.length} altered).`);
  }
} finally {
  await pool.end();
}
