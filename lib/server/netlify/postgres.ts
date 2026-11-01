import { ApiError } from "../http.ts";

export type QueryResult = { rows: Record<string, unknown>[]; rowCount: number | null };
export type QueryConnection = { query: (sql: string, values?: unknown[]) => Promise<QueryResult> };
export type PoolConnection = QueryConnection & { release: () => void };
export type QueryPool = QueryConnection & { connect: () => Promise<PoolConnection> };

// Only application-authored SQL enters this adapter; values stay parameterized.
export function postgresQuery(source: string, values: unknown[]) {
  const ignore = /^INSERT OR IGNORE\b/i.test(source);
  let sql = source.replace(/^INSERT OR IGNORE\b/i, "INSERT");
  sql = sql.replace(/SET count=count\+1\b/, "SET count=rate_limits.count+1");
  let quote = "", index = 0, result = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (quote) {
      result += char;
      if (char === quote) {
        if (sql[i + 1] === quote) result += sql[++i];
        else quote = "";
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      result += char;
    } else result += char === "?" ? "$" + ++index : char;
  }
  if (quote || index !== values.length) throw new Error("Invalid application SQL parameters.");
  if (ignore) result = result.replace(/;\s*$/, "") + " ON CONFLICT DO NOTHING";
  return { text: result, values };
}

function databaseError(error: unknown): never {
  const value = error as { code?: string; constraint?: string };
  if (value.code === "23505") {
    if (value.constraint === "claims_active_pair_unique") {
      throw new ApiError(409, "duplicate_claim", "You already have an active claim for this pair of reports.");
    }
    throw new Error("UNIQUE constraint failed", { cause: error });
  }
  throw error;
}

function resultView(result: QueryResult) {
  const results = result.rows.map(row => typeof row.count === "string" && /^\d+$/.test(row.count)
    ? { ...row, count: Number(row.count) } : row);
  return { results, success: true, meta: { changes: result.rowCount ?? 0 } };
}

class Statement {
  readonly sql: string;
  readonly values: unknown[];
  readonly owner: PostgresDatabase;
  constructor(owner: PostgresDatabase, sql: string, values: unknown[] = []) {
    this.owner = owner; this.sql = sql; this.values = values;
  }
  bind(...values: unknown[]) { return new Statement(this.owner, this.sql, values); }
  async execute(connection: QueryConnection) {
    const query = postgresQuery(this.sql, this.values);
    return resultView(await connection.query(query.text, query.values));
  }
  async all<T>() {
    try { return await this.execute(this.owner.pool()) as { results: T[]; success: boolean; meta: { changes: number } }; }
    catch (error) { return databaseError(error); }
  }
  async first<T>() { return (await this.all<T>()).results[0] ?? null; }
  run() { return this.all(); }
}

export class PostgresDatabase {
  readonly pool: () => QueryPool;
  constructor(pool: () => QueryPool) { this.pool = pool; }
  prepare(sql: string) { return new Statement(this, sql); }
  async batch(statements: Statement[]) {
    if (statements.some(statement => statement.owner !== this)) throw new Error("Mixed database batch.");
    for (let attempt = 0; attempt < 4; attempt++) {
      const client = await this.pool().connect();
      try {
        // Keep state transitions atomic when competing requests arrive.
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const results = [];
        for (const statement of statements) results.push(await statement.execute(client));
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        const code = (error as { code?: string }).code;
        if ((code === "40001" || code === "40P01") && attempt < 3) continue;
        return databaseError(error);
      } finally { client.release(); }
    }
    throw new Error("Transaction retries exhausted.");
  }
  asD1(): D1Database { return this as unknown as D1Database; }
}
