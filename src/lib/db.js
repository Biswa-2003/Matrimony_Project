import pkg from "pg";
const { Pool } = pkg;

/**
 * Hardened Postgres pool.
 *  - One pool per process, cached on globalThis so dev hot-reloads don't leak connections
 *    ("sorry, too many clients already").
 *  - An 'error' listener: when Neon/Postgres drops an idle connection, pg emits 'error' on the
 *    pool. Without a listener Node treats it as an uncaught exception and the server crashes.
 *  - Timeouts so a slow or unreachable database fails fast instead of hanging requests.
 *  - Slow-query logging to make backend latency visible.
 */
const SLOW_QUERY_MS = Number(process.env.DB_SLOW_QUERY_MS || 750);

function buildConfig() {
  const common = {
    max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 5 : 10)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15_000),
    query_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15_000) + 2_000,
    keepAlive: true,
  };

  const DATABASE_URL = process.env.DATABASE_URL;
  if (DATABASE_URL) {
    const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
    return { ...common, connectionString: DATABASE_URL, ssl: isLocal ? false : { rejectUnauthorized: false } };
  }
  if (process.env.DB_HOST && process.env.DB_USER) {
    const isLocal = process.env.DB_HOST === "localhost" || process.env.DB_HOST === "127.0.0.1";
    return {
      ...common,
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    };
  }
  throw new Error("Database configuration is missing (DATABASE_URL or DB_* environment variables).");
}

export function getPool() {
  if (!globalThis.__matrimonyPgPool) {
    const pool = new Pool(buildConfig());
    pool.on("error", (err) => {
      // Idle client was disconnected by the server — pg will create a fresh one on next use.
      console.error("[db] idle client error (handled):", err.message);
    });
    globalThis.__matrimonyPgPool = pool;
  }
  return globalThis.__matrimonyPgPool;
}

export const pool = new Proxy({}, {
  get(target, prop) {
    const actualPool = getPool();
    const value = actualPool[prop];
    return typeof value === "function" ? value.bind(actualPool) : value;
  }
});

export async function query(text, params) {
  const start = Date.now();
  try {
    return await getPool().query(text, params);
  } finally {
    const ms = Date.now() - start;
    if (ms > SLOW_QUERY_MS) {
      const sql = String(text).replace(/\s+/g, " ").trim().slice(0, 140);
      console.warn(`[db] slow query ${ms}ms: ${sql}`);
    }
  }
}

export const getClient = () => getPool().connect();

export default pool;
