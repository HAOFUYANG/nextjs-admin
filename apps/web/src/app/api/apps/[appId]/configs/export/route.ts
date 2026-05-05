import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { table as tableSchema } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) => {
  try {
    const { appId } = await params;
    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = body?.ids;
    const keyword: string = body?.keyword || "";
    const version: string = body?.version || "";

    const conditions = [eq(tableSchema.appId, appId)];
    if (ids && ids.length > 0) {
      const idList = ids.map((id) => sql`${id}`);
      conditions.push(
        sql`${tableSchema.id} = ANY (ARRAY[${sql.join(idList, sql`, `)}])`,
      );
    }
    if (keyword.trim()) {
      conditions.push(
        sql`${tableSchema.name} ILIKE ${"%" + keyword.trim() + "%"}`,
      );
    }
    if (version.trim()) {
      conditions.push(eq(tableSchema.version, version.trim()));
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(tableSchema)
            .where(and(...conditions))
        : await db.select().from(tableSchema);

    const header = ["id", "name", "version", "appId", "createTime"];
    const typed = rows as Array<{
      id: string;
      name: string;
      version: string;
      appId: string;
      createTime: Date | null;
    }>;
    const csv = [
      header.join(","),
      ...typed.map((r) =>
        [
          r.id,
          `"${String(r.name).replace(/"/g, '""')}"`,
          r.version,
          r.appId,
          r.createTime ? new Date(r.createTime).toISOString() : "",
        ].join(","),
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="app-${appId}-configs.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        errno: -1,
        message: error instanceof Error ? error.message : "导出失败",
      },
      { status: 500 },
    );
  }
};
