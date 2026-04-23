import { db } from "@/lib/db";
import { appInfo } from "@/lib/schema";
import { error } from "console";
import { NextResponse } from "next/server";

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
