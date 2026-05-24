// Real-Time Prescription Benefit lookup.
//
// POST /api/integrations/drug-ecosystem/rtpb
//   body: { patient, prescriber, pharmacyNcpdpId, drug }
//   → returns pricing options, alternatives, and eligibility
//
// Auth: required EMR session. The route hits a mock transport when
// no RTPB API key is configured so dev/CI work without credentials.

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/observability/log";
import { loadDrugEcosystemConfig } from "@/lib/integrations/drug-ecosystem/config";
import {
  RtpbClient,
  RtpbError,
  createMockRtpbTransport,
} from "@/lib/integrations/drug-ecosystem/rtpb";

const inputSchema = z.object({
  patient: z.object({
    memberId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    gender: z.enum(["M", "F", "U"]),
  }),
  prescriber: z.object({
    npi: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  pharmacyNcpdpId: z.string(),
  drug: z.object({
    rxcui: z.string().optional(),
    freeText: z.string().optional(),
    ndc: z.string().optional(),
    quantity: z.number(),
    quantityUnitOfMeasure: z.string(),
    daysSupply: z.number(),
  }),
});

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: z.infer<typeof inputSchema>;
  try {
    body = inputSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const config = loadDrugEcosystemConfig();
  const client = new RtpbClient({
    endpoint: config.rtpb.endpoint,
    apiKey: config.rtpb.apiKey,
    fetchImpl: config.rtpb.configured ? undefined : createMockRtpbTransport(),
  });

  try {
    const quote = await client.quote(body);
    logger.info({
      event: "rtpb.quote.success",
      pharmacyCount: quote.pricingOptions.length,
      alternativesCount: quote.alternatives.length,
      mock: !config.rtpb.configured,
    });
    return NextResponse.json({ quote, mock: !config.rtpb.configured });
  } catch (err) {
    logger.warn({ event: "rtpb.quote.failed", error: err });
    if (err instanceof RtpbError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "RTPB lookup failed" }, { status: 500 });
  }
}
