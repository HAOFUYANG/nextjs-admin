import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const appInfo = pgTable("app_info", {
  id: text("id").primaryKey(),
  appName: text("app_name").notNull(),
  appId: text("app_id").notNull(),
  createTime: timestamp("create_time").defaultNow().notNull(),
});
