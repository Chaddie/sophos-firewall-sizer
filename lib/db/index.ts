import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}

const sql = neon(connectionString ?? "postgresql://localhost:5432/placeholder");
export const db = drizzle(sql, { schema });
