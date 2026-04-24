import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { table } from "@/lib/schema";
import { randomUUID } from "crypto";

export const POST = async (request: Request) => {
  console.log("request :>> ", request);
  try {
    const body = await request.json();
    console.log("body :>> ", body);
    const { name, version, appId, configFileInfo } = body;
    if (!name || !version || !appId || !configFileInfo) {
      return NextResponse.json(
        { errno: -1, message: "缺少参数" },
        { status: 400 },
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
  } catch (error) {}
};
