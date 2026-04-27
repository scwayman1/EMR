// EMR-077 — EMAR drug catalog search.
//
// GET /api/emar/drugs?q=lisinopril
//   Returns matching drugs and their formulations from the EMAR catalog.
//
// Reads from the in-memory seed (src/lib/emar/catalog.ts) until the
// Prisma migration for the EMAR tables ships. When the tables exist
// the resolver inside searchEmarDrugs will switch to a Prisma query
// without changing the route shape.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { searchEmarDrugs } from "@/lib/emar/search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const result = searchEmarDrugs(q);

  return NextResponse.json(result);
}
