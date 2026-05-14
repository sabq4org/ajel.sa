/**
 * Drizzle ORM client for Neon PostgreSQL
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("NEON_DATABASE_URL or DATABASE_URL is not set");
}

const sql = postgres(connectionString, {
  ssl: "require",
  max: 1,
});

export const db = drizzle(sql, { schema });

export * from "./schema";
