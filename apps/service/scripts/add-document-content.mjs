// 一次性迁移脚本：为 document 表添加 content 字段
// 使用：node scripts/add-document-content.mjs
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL missing');
  process.exit(1);
}

const shouldUseSsl = process.env.POSTGRES_URL.includes('neon.tech');
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  await pool.query(
    `ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "content" text`,
  );
  console.log('✓ document.content column ensured');
} catch (err) {
  console.error('× failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
