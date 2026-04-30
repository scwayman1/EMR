import { NextRequest, NextResponse } from "next/server";
import { listStudies } from "@/lib/domain/medical-imaging-store";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId") ?? undefined;
  return NextResponse.json({ studies: listStudies(patientId) });
}
