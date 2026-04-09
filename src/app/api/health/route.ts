import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "web", db: "ok" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, service: "web", db: "down", error: String(err) },
      { status: 503 }
    );
  }
}
