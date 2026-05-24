// Electronic Prior Authorization endpoint.
//
// POST /api/integrations/drug-ecosystem/epa
//   action=detect → ask the payer if PA is required
//   action=submit → submit answers and receive determination
//
// Both phases persist into the EpaRequest model so the dashboard
// can render the open queue and the prescribe UI can resume a
// multi-round conversation across sessions.

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/observability/log";
import { loadDrugEcosystemConfig } from "@/lib/integrations/drug-ecosystem/config";
import {
  EpaClient,
  EpaError,
  createMockEpaTransport,
} from "@/lib/integrations/drug-ecosystem/epa";
import {
  createEpaRequest,
  recordDetectResponse,
  recordSubmitResponse,
} from "@/lib/integrations/drug-ecosystem/epa-store";

const patientSchema = z.object({
  memberId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(["M", "F", "U"]),
});

const prescriberSchema = z.object({
  npi: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  deaNumber: z.string().optional(),
});

const payerSchema = z.object({
  id: z.string(),
  name: z.string(),
  bin: z.string().optional(),
  pcn: z.string().optional(),
  groupId: z.string().optional(),
});

const drugSchema = z.object({
  rxcui: z.string().optional(),
  ndc: z.string().optional(),
  drugDescription: z.string(),
  quantity: z.number(),
  daysSupply: z.number(),
  sig: z.string(),
});

const detectSchema = z.object({
  action: z.literal("detect"),
  prescriptionId: z.string(),
  patientId: z.string(),
  providerId: z.string(),
  patient: patientSchema,
  prescriber: prescriberSchema,
  payer: payerSchema,
  drug: drugSchema,
  clinical: z.object({
    diagnosisCodes: z.array(
      z.object({ code: z.string(), codeQualifier: z.literal("ICD10") }),
    ),
    rationale: z.string(),
    triedAlternatives: z.array(z.string()).optional(),
    contraindications: z.array(z.string()).optional(),
  }),
});

const submitSchema = z.object({
  action: z.literal("submit"),
  epaRequestId: z.string(),
  payerAuthNumber: z.string().optional(),
  patient: patientSchema,
  prescriber: prescriberSchema,
  payer: payerSchema,
  drug: drugSchema,
  clinical: z.object({
    diagnosisCodes: z.array(
      z.object({ code: z.string(), codeQualifier: z.literal("ICD10") }),
    ),
    rationale: z.string(),
    triedAlternatives: z.array(z.string()).optional(),
    contraindications: z.array(z.string()).optional(),
  }),
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
      ]),
    }),
  ),
});

const bodySchema = z.discriminatedUnion("action", [detectSchema, submitSchema]);

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!user.organizationId) {
    return new NextResponse("Organization required", { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const config = loadDrugEcosystemConfig();
  const client = new EpaClient({
    endpoint: config.epa.endpoint,
    apiKey: config.epa.apiKey,
    fetchImpl: config.epa.configured ? undefined : createMockEpaTransport(),
  });

  try {
    if (body.action === "detect") {
      const detect = await client.detect({
        patient: body.patient,
        prescriber: body.prescriber,
        payer: body.payer,
        drug: body.drug,
      });
      const epaRequest = await createEpaRequest({
        organizationId: user.organizationId,
        prescriptionId: body.prescriptionId,
        patientId: body.patientId,
        providerId: body.providerId,
        rxcui: body.drug.rxcui,
        drugDescription: body.drug.drugDescription,
        payerId: body.payer.id,
        payerName: body.payer.name,
        memberId: body.patient.memberId,
        clinical: body.clinical,
      });
      await recordDetectResponse(epaRequest.id, detect);
      logger.info({
        event: "epa.detect.success",
        epaRequestId: epaRequest.id,
        paRequired: detect.paRequired,
        mock: !config.epa.configured,
      });
      return NextResponse.json({
        epaRequestId: epaRequest.id,
        detect,
        mock: !config.epa.configured,
      });
    }

    const submit = await client.submit({
      requestId: body.epaRequestId,
      payerAuthNumber: body.payerAuthNumber,
      patient: body.patient,
      prescriber: body.prescriber,
      payer: body.payer,
      drug: body.drug,
      clinical: body.clinical,
      answers: body.answers,
    });
    await recordSubmitResponse(body.epaRequestId, body.answers, submit);
    logger.info({
      event: "epa.submit.success",
      epaRequestId: body.epaRequestId,
      status: submit.status,
      mock: !config.epa.configured,
    });
    return NextResponse.json({
      epaRequestId: body.epaRequestId,
      submit,
      mock: !config.epa.configured,
    });
  } catch (err) {
    logger.warn({ event: "epa.request.failed", error: err });
    if (err instanceof EpaError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "ePA request failed" }, { status: 500 });
  }
}
