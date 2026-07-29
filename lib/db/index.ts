import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure a Postgres connection.",
    );
  }

  if (!dbInstance) {
    const sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
  }

  return dbInstance;
}

/** @deprecated Use getDb() — kept for existing imports */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop, getDb());
  },
});
