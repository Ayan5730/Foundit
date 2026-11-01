import { getDatabase, getConnectionString } from "@netlify/database";
import { getUser } from "@netlify/identity";
import { PostgresDatabase, type QueryPool } from "./postgres.ts";
import { privateBucket } from "./storage.ts";

let database: ReturnType<typeof getDatabase> | undefined;
let connectionString: string | undefined;
const db = new PostgresDatabase(() => {
  const current = getConnectionString();
  if (!database || connectionString !== current) {
    const previous = database;
    database = getDatabase(); connectionString = current;
    void previous?.pool.end().catch(() => {});
  }
  return database.pool as unknown as QueryPool;
});
export function bindings() {
  return {
    DB: db.asD1(), BUCKET: privateBucket(), STAFF_USER_IDS: process.env.STAFF_USER_IDS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_MODEL: process.env.OPENAI_MODEL,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY, CEREBRAS_MODEL: process.env.CEREBRAS_MODEL,
    EXA_API_KEY: process.env.EXA_API_KEY,
  };
}
export async function identity() {
  const user = await getUser();
  if (!user) return null;
  return { userId: user.id, displayName: user.name ?? user.email ?? "FoundIt attendee" };
}
