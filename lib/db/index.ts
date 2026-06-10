import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,

    // Important for Neon/Postgres over TLS
    ssl: {
      rejectUnauthorized: false,
    },

    // Do not allow too many connections from Next.js
    max: 5,

    // Close idle clients after 30 seconds
    idleTimeoutMillis: 30_000,

    // Fail faster instead of hanging forever
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

pool.on("error", (err) => {
  console.error("[POSTGRES_POOL_ERROR]", {
    message: err.message,
    code: (err as any).code,
    errno: (err as any).errno,
    syscall: (err as any).syscall,
    stack: err.stack,
  });
});

export const db = drizzle(pool, { schema });