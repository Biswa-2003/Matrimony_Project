import pkg from 'pg';
const { Pool } = pkg;

// ✅ Create pool with proper configuration for Neon
let pool;

try {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (DATABASE_URL) {
    // ✅ Using Neon connection string
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    console.log('✅ Database pool created with DATABASE_URL');
  } else {
    // ✅ Fallback to individual environment variables
    pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });
    console.log('✅ Database pool created with individual env vars');
  }
} catch (error) {
  console.error('❌ Error creating database pool:', error);
  throw error;
}

// ✅ Export both pool and query function
export { pool };

export const query = async (text, params) => {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }
  return pool.query(text, params);
};

export default pool;
