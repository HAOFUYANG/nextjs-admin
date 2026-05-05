import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import path from "node:path";
import os from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { uploadedFile } from "@/lib/schema";

export const POST = async (request: Request) => {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { errno: -1, message: "未选择文件" },
        { status: 400 },
      );
    }
    const blob = file as unknown as File;
    const bytes = await blob.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dir = path.join(os.tmpdir(), "uploads");
    const filename = `${Date.now()}-${blob.name}`;
    const filepath = path.join(dir, filename);
    await mkdir(dir, { recursive: true });
    await writeFile(filepath, buffer);
    const inserted = await db
      .insert(uploadedFile)
      .values({
        originalName: blob.name,
        storedAs: filename,
        mime: blob.type || "application/octet-stream",
        size: Number(blob.size) || 0,
        content: buffer.toString("base64"),
      })
      .returning({
        id: uploadedFile.id,
      });
    return NextResponse.json({
      errno: 0,
      message: "上传成功",
      data: {
        id: inserted[0]?.id,
        filename: blob.name,
        storedAs: filename,
        mime: blob.type,
        size: blob.size,
      },
    });
  } catch (error) {
    console.log("上传文件失败", error);
    return NextResponse.json(
      {
        errno: -1,
        message: error instanceof Error ? error.message : "上传文件失败",
      },
      {
        status: 500,
      },
    );
  }
};
