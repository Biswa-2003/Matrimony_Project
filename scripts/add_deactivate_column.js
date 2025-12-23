
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the project root (one level up from scripts)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log('Connecting to DB...');
        console.log('DB Host:', process.env.DB_HOST);

        console.log('Adding deactivate_until column to matrimony_profiles...');
        await pool.query(`
      ALTER TABLE matrimony_profiles 
      ADD COLUMN IF NOT EXISTS deactivate_until TIMESTAMP;
    `);
        console.log('Success! Column added.');
    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await pool.end();
    }
}

run();
