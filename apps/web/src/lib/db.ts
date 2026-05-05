import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import * as schema from "@/lib/table/schema";

dotenv.config();
if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is required");
}

// 使用 pg 库的 Pool 创建连接池
const shouldUseSsl = process.env.POSTGRES_URL.includes("neon.tech");
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
