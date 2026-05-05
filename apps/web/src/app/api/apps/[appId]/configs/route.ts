import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { table as tableSchema } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) => {
  try {
    const { appId } = await params;
    const body = await request.json();
    const { keyword, version, page = 1, pageSize = 10 } = body ?? {};

    const conditions = [eq(tableSchema.appId, appId)];

    if (keyword && typeof keyword === "string" && keyword.trim()) {
      conditions.push(
        sql`${tableSchema.name} ILIKE ${"%" + keyword.trim() + "%"}`,
      );
    }
    if (version && typeof version === "string" && version.trim()) {
      conditions.push(eq(tableSchema.version, version.trim()));
    }

    const limit = Math.max(1, Math.min(Number(pageSize) || 10, 100));
    const offset = Math.max(0, ((Number(page) || 1) - 1) * limit);

    const result = await db
      .select()
      .from(tableSchema)
      .where(and(...conditions))
      .orderBy(desc(tableSchema.createTime))
      .limit(limit)
      .offset(offset);

    // 统计信息
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tableSchema)
      .where(and(...conditions));

    const lastUpdatedRow = await db
      .select({ createTime: tableSchema.createTime })
      .from(tableSchema)
      .where(eq(tableSchema.appId, appId))
      .orderBy(desc(tableSchema.createTime))
      .limit(1);

    const versionRows = await db
      .selectDistinct({ version: tableSchema.version })
      .from(tableSchema)
      .where(eq(tableSchema.appId, appId));

    return NextResponse.json({
      errno: 0,
      data: result,
      stats: {
        total: count,
        lastUpdated: lastUpdatedRow[0]?.createTime ?? null,
        versions: versionRows.map((r) => r.version),
      },
      page: Number(page) || 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error("应用配置查询失败:", error);
    return NextResponse.json(
      {
        errno: -1,
        message: error instanceof Error ? error.message : "查询失败",
      },
      { status: 500 },
    );
  }
};
