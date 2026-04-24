import { NextResponse } from "next/server";
import { table } from "@/lib/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export const DELETE = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  const { id } = await params;
  try {
    const result = await db.delete(table).where(eq(table.id, id)).returning();
    console.log("result :>> ", result);
    if (result.length === 0) {
      return NextResponse.json(
        { errno: -1, message: "配置不存在" },
        { status: 404 },
      );
    }
    return NextResponse.json({ errno: 0, data: result[0] });
  } catch (error) {
    return NextResponse.json({ errno: -1, message: "删除失败" });
  }
};

export const GET = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  try {
    const { id } = await params;
    const result = await db.select().from(table).where(eq(table.id, id));
    if (result.length === 0) {
      return NextResponse.json(
        { errno: -1, message: "配置不存在" },
        { status: 404 },
      );
    }
    return NextResponse.json({ errno: 0, data: result[0] });
  } catch (error) {
    return NextResponse.json(
      { errno: -1, message: "获取失败" },
      { status: 500 },
    );
  }
};

export const PUT = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { version, appId, configFileInfo } = body ?? {};
    if (!version || !appId || !configFileInfo) {
      return NextResponse.json(
        { errno: -1, message: "缺少必填字段" },
        { status: 400 },
      );
    }
    const result = await db
      .update(table)
      .set({ version, appId, configFileInfo })
      .where(eq(table.id, id))
      .returning();
    if (result.length === 0) {
      return NextResponse.json(
        { errno: -1, message: "配置不存在" },
        { status: 404 },
      );
    }
    return NextResponse.json({ errno: 0, data: result[0] });
  } catch (error) {
    return NextResponse.json(
      { errno: -1, message: "更新失败" },
      { status: 500 },
    );
  }
};
