// Surescripts e-prescribe transmission endpoint.
//
// Accepts a signed prescription, builds the NCPDP SCRIPT envelope,
// transmits to the configured Surescripts gateway (sandbox / cert-tester
// / production), and persists the round-trip to the
// SurescriptsTransaction log so the integrations dashboard can render
// connection health.
//
// Auth: requires an authenticated EMR session OR a service-to-service
// bearer token (WEBHOOK_SECRET). The session path covers UI-initiated
// transmissions; the bearer path covers async workers and retries.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";
import { getCurrentUser } from "@/lib/auth/session";
import {
  loadDrugEcosystemConfig,
  toSurescriptsEnvironment,
} from "@/lib/integrations/drug-ecosystem/config";
import { recordTransaction } from "@/lib/integrations/drug-ecosystem/transactions";
import {
  SureScriptsClient,
  createMockTransport,
  type Environment as SurescriptsEnvironment,
} from "@/lib/integrations/pharmacy/surescripts-client";

const payloadSchema = z.object({
  prescriptionId: z.string().min(1),
  providerId: z.string().min(1),
  patientId: z.string().min(1),
  pharmacyNcpdpId: z.string().min(1),
  rxcui: z.string().optional(),
  ndc: z.string().optional(),
  dispenseAsWritten: z.boolean().optional(),
  prescription: z.object({
    id: z.string(),
    organizationId: z.string(),
    patientId: z.string(),
    providerId: z.string(),
    status: z.string(),
    productName: z.string(),
    productType: z.string(),
    route: z.string(),
    doseAmount: z.number(),
    doseUnit: z.string(),
    frequency: z.string(),
    frequencyPerDay: z.number(),
    timingInstructions: z.string().optional(),
    daysSupply: z.number().int(),
    quantity: z.number(),
    quantityUnit: z.string(),
    refills: z.number().int().nonnegative(),
    diagnosisCodes: z.array(
      z.object({ code: z.string(), label: z.string() }),
    ),
    pharmacyName: z.string().optional(),
    pharmacyAddress: z.string().optional(),
    pharmacyPhone: z.string().optional(),
    pharmacyFax: z.string().optional(),
    noteToPharmacy: z.string().optional(),
    interactionsReviewed: z.boolean(),
    contraindicationsReviewed: z.boolean(),
    signedAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  patient: z.object({
    identifier: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    gender: z.enum(["M", "F", "U"]),
    address: z
      .object({
        line1: z.string(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
      })
      .optional(),
    phone: z.string().optional(),
  }),
  prescriber: z.object({
    spi: z.string(),
    npi: z.string(),
    deaNumber: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    clinicName: z.string(),
    phone: z.string(),
    fax: z.string().optional(),
    address: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
    }),
  }),
  /** Force the sandbox mock transport even if real creds are configured. */
  useMock: z.boolean().optional(),
});

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const user = await getCurrentUser();

  const serviceAuthOk =
    secret.length > 0 && authHeader === `Bearer ${secret}`;
  const sessionOk = Boolean(user?.organizationId);
  if (!sessionOk && !serviceAuthOk) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: z.infer<typeof payloadSchema>;
  try {
    body = payloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const provider = await prisma.provider.findUnique({
    where: { id: body.providerId },
  });
  if (!provider || !provider.npi) {
    return NextResponse.json(
      { error: "Provider not authorized for e-prescribe" },
      { status: 403 },
    );
  }

  const config = loadDrugEcosystemConfig();
  const shouldUseMock =
    body.useMock === true ||
    !config.surescripts.configured ||
    config.environment === "sandbox";

  const env: SurescriptsEnvironment = toSurescriptsEnvironment(
    config.environment,
  );

  const client = new SureScriptsClient({
    environment: env,
    endpointUrl: config.surescripts.endpoint,
    credentials: {
      accountId: config.surescripts.accountId ?? "SANDBOX-ACCT",
      prescriberSpi: config.surescripts.prescriberSpi ?? body.prescriber.spi,
      apiKey: config.surescripts.apiKey ?? "sandbox-key",
    },
    fetchImpl: shouldUseMock ? createMockTransport() : undefined,
  });

  try {
    const result = await client.sendNewRx({
      prescription: body.prescription as unknown as Parameters<
        typeof client.sendNewRx
      >[0]["prescription"],
      patient: body.patient,
      prescriber: body.prescriber,
      pharmacyNcpdpId: body.pharmacyNcpdpId,
      rxcui: body.rxcui,
      ndc: body.ndc,
      dispenseAsWritten: body.dispenseAsWritten,
    });

    const organizationId = user?.organizationId ?? body.prescription.organizationId;
    await recordTransaction({
      organizationId,
      environment: config.environment,
      direction: "outbound",
      message: result.sentEnvelope,
      ack: result.ack,
      result,
      prescriptionId: body.prescriptionId,
      patientId: body.patientId,
      providerId: body.providerId,
    });

    logger.info({
      event: "surescripts.transmit.success",
      surescriptsMessageId: result.messageId,
      confirmationNumber: result.confirmationNumber,
      status: result.status,
      latencyMs: result.latencyMs,
      environment: config.environment,
      mock: shouldUseMock,
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      messageId: result.messageId,
      confirmationNumber: result.confirmationNumber,
      latencyMs: result.latencyMs,
      environment: config.environment,
      mock: shouldUseMock,
    });
  } catch (err) {
    logger.error({
      event: "surescripts.transmit.failed",
      error: err,
      prescriptionId: body.prescriptionId,
      environment: config.environment,
    });
    return NextResponse.json(
      {
        error: "Failed to transmit prescription",
        code: (err as { code?: string }).code ?? "unknown",
        message: (err as Error).message,
      },
      { status: 502 },
    );
  }
}
