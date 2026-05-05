import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appInfo, table as tableSchema } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";


export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const { name, appId, version, page = 1, pageSize = 10 } = body ?? {};

    const conditions = [];
    if (name && typeof name === "string" && name.trim()) {
      conditions.push(
        sql`${tableSchema.name} ILIKE ${"%" + name.trim() + "%"}`,
      );
    }
    if (appId && typeof appId === "string" && appId.trim()) {
      conditions.push(eq(tableSchema.appId, appId.trim()));
    }
    if (version && typeof version === "string" && version.trim()) {
      conditions.push(eq(tableSchema.version, version.trim()));
    }

    const limit = Math.max(1, Math.min(Number(pageSize) || 10, 100));
    const offset = Math.max(0, ((Number(page) || 1) - 1) * limit);

    const base =
      conditions.length > 0
        ? db
            .select({
              id: tableSchema.id,
              name: tableSchema.name,
              version: tableSchema.version,
              appId: tableSchema.appId,
              configFileInfo: tableSchema.configFileInfo,
              createTime: tableSchema.createTime,
              appName: appInfo.appName,
            })
            .from(tableSchema)
            .leftJoin(appInfo, eq(tableSchema.appId, appInfo.appId))
            .where(and(...conditions))
        : db
            .select({
              id: tableSchema.id,
              name: tableSchema.name,
              version: tableSchema.version,
              appId: tableSchema.appId,
              configFileInfo: tableSchema.configFileInfo,
              createTime: tableSchema.createTime,
              appName: appInfo.appName,
            })
            .from(tableSchema)
            .leftJoin(appInfo, eq(tableSchema.appId, appInfo.appId));

    const result = await base
      .orderBy(desc(tableSchema.createTime))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      errno: 0,
      data: result,
      page: Number(page) || 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error("列表查询失败:", error);
    return NextResponse.json(
      {
        errno: -1,
        message: error instanceof Error ? error.message : "列表查询失败",
      },
      { status: 500 },
    );
  }
};