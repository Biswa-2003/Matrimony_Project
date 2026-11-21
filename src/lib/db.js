import pkg from "pg";
const { Pool } = pkg;

let poolInstance = null;

export function getPool() {
  if (!poolInstance) {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (DATABASE_URL) {
      const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
      poolInstance = new Pool({
        connectionString: DATABASE_URL,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });
    } else if (process.env.DB_HOST && process.env.DB_USER) {
      const isLocal = process.env.DB_HOST === "localhost" || process.env.DB_HOST === "127.0.0.1";
      poolInstance = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });
    } else {
      throw new Error("Database configuration is missing (DATABASE_URL or DB_* environment variables).");
    }
  }
  return poolInstance;
}

export const pool = new Proxy({}, {
  get(target, prop) {
    const actualPool = getPool();
    const value = actualPool[prop];
    return typeof value === "function" ? value.bind(actualPool) : value;
  }
});

export const query = (text, params) => getPool().query(text, params);

export const getClient = () => getPool().connect();

export default pool;
