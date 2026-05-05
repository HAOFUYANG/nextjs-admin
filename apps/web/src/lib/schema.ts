// 导入 drizzle ORM 的 schema 定义所需的类型和函数
import {
  pgTable,
  text,
  timestamp,
  integer,
  uniqueIndex,
  foreignKey,
  boolean,
} from "drizzle-orm/pg-core";
import { tableDetail } from "./table/schema";
import { appInfo as appInfoData } from "./app";
import { uploadedFileInfo as uploadedFileDetail } from "./file/schema";

export const table = tableDetail;
export const uploadedFile = uploadedFileDetail;
export const appInfo = appInfoData;

export type Table = typeof table.$inferSelect;
export type UploadedFile = typeof uploadedFileDetail.$inferSelect;
export type NewUploadedFile = typeof uploadedFileDetail.$inferInsert;
export type AppInfo = typeof appInfo.$inferSelect;
