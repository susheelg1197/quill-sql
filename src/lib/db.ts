// src/lib/db.ts
import { Pool } from "pg";
import { env } from "./env";

// Reuse the same pool in dev (Next HMR) via globalThis
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL, // ← only from env
    // Optional: enable SSL in prod providers (Neon/Render/etc.)
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;