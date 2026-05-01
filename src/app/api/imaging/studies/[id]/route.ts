import { NextResponse } from "next/server";
import {
  getReportForStudy,
  getStudy,
  listAnnotations,
} from "@/lib/domain/medical-imaging-store";

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const study = getStudy(params.id);
  if (!study) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    study,
    annotations: listAnnotations(study.id),
    report: getReportForStudy(study.id),
  });
}
