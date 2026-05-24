// RxNorm lookup proxy.
//
// GET /api/integrations/drug-ecosystem/rxnorm?name=<free text>
//   → resolves a free-text drug name to its best-match RXCUI
//
// GET /api/integrations/drug-ecosystem/rxnorm?rxcui=<rxcui>
//   → returns the canonical concept + related codes (IN, BN, SBD, etc.)
//
// The EMR's prescribe UI calls this immediately after drug picker
// selection so the resulting NCPDP message can carry a real RXCUI
// rather than free text.

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/observability/log";
import { loadDrugEcosystemConfig } from "@/lib/integrations/drug-ecosystem/config";
import {
  RxNormClient,
  RxNormError,
} from "@/lib/integrations/drug-ecosystem/rxnorm";

export async function GET(req: Request) {
  try {
    await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const rxcui = url.searchParams.get("rxcui");

  if (!name && !rxcui) {
    return NextResponse.json(
      { error: "Either name or rxcui is required" },
      { status: 400 },
    );
  }

  const config = loadDrugEcosystemConfig();
  const client = new RxNormClient({ endpoint: config.rxnorm.endpoint });

  try {
    if (rxcui) {
      const concept = await client.lookupRxcui(rxcui);
      return NextResponse.json({ concept });
    }
    const matched = await client.findRxcui(name!);
    if (!matched) return NextResponse.json({ rxcui: null });
    const concept = await client.lookupRxcui(matched);
    return NextResponse.json({ rxcui: matched, concept });
  } catch (err) {
    logger.warn({
      event: "rxnorm.lookup.failed",
      error: err,
      name,
      rxcui,
    });
    if (err instanceof RxNormError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 404 ? 404 : 502 },
      );
    }
    return NextResponse.json({ error: "RxNorm lookup failed" }, { status: 500 });
  }
}
