import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const uploadedFileDetail = pgTable("uploaded_file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  originalName: text("original_name").notNull(),
  storedAs: text("stored_as").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tableDetail = pgTable("table", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  appId: text("app_id").notNull(),
  configFileInfo: jsonb("config_file_info").$type<{
    id: string;
    filename: string;
  }>(),
  createTime: timestamp("create_time").defaultNow().notNull(),
});
