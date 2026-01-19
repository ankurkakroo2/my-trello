import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./../drizzle/schema";

const sqlite = new Database("./data/tasks.db");

export const db = drizzle(sqlite, { schema });

// Export the type for use in API routes
export type DB = typeof db;
