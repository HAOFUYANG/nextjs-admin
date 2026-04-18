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
import { tableDetail, uploadedFileDetail } from "./table/schema";
import { appInfo as appInfoData } from "./app";


export const table = tableDetail;
export const uploadedFile = uploadedFileDetail;
export const appInfo = appInfoData;


export type Table = typeof table.$inferSelect;
export type UploadedFile = typeof uploadedFile.$inferSelect;
export type NewUploadedFile = typeof uploadedFile.$inferInsert;
export type AppInfo = typeof appInfo.$inferSelect;
