import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { table } from "@/lib/schema";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const { name, version, appId, configFileInfo } = body;
    if (!name || !version || !appId || !configFileInfo) {
      return NextResponse.json(
        { errno: -1, message: "缺少参数" },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ id: table.id })
      .from(table)
      .where(
        and(eq(table.name, name.trim()), eq(table.version, version.trim())),
      )
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { errno: -1, message: "当前配置下配置的版本已经存在，请修改" },
        { status: 409 },
      );
    }

    const id = randomUUID();
    const result = await db
      .insert(table)
      .values({
        id,
        name,
        version,
        appId,
        configFileInfo,
      })
      .returning();
    return NextResponse.json({
      errno: 0,
      message: "success",
      data: result[0],
    });
  } catch (error) {
    console.error("创建配置失败:", error);
    return NextResponse.json(
      { errno: -1, message: "创建配置失败" },
      { status: 500 },
    );
  }
};
