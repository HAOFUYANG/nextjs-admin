import { db } from "@/lib/db";
import { appInfo } from "@/lib/schema";
import { error } from "console";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const GET = async () => {
  try {
    const result = await db.select().from(appInfo);
    return Response.json({
      errno: 0,
      data: result,
    });
  } catch (error) {
    console.log("获取应用列表失败", error);
    return NextResponse.json(
      {
        errno: -1,
        message: "获取应用列表失败",
      },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const id = randomUUID();
    const { appName, appId } = await request.json();
    // 验证必填字段
    if (!appName || !appId) {
      return NextResponse.json(
        {
          errno: -1,
          message: "appName, appId",
        },
        { status: 400 },
      );
    }
    const result = await db.insert(appInfo).values({ id, appName, appId });
    return NextResponse.json({ errno: 0, data: result });
  } catch (error) {
    console.log("添加应用失败", error);
    return NextResponse.json(
      {
        errno: -1,
        message: "添加应用失败",
      },
      { status: 500 },
    );
  }
};
