import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const uploadedFileInfo = pgTable("uploaded_file", {
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
