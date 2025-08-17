// src/lib/env.ts
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
};

if (!env.DATABASE_URL) {
  // Fail early on server boot if DB URL is missing.
  // (Remove this throw if you prefer graceful 500s)
  throw new Error("DATABASE_URL is not set. Add it to .env.local");
}