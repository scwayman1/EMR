// Medication history fetch + reconciliation.
//
// POST /api/integrations/drug-ecosystem/medication-history
//   body: { patient, prescriberNpi, windowDays?, emrMedications? }
//
// Returns the external dispense list and, if emrMedications was
// provided, a reconciliation diff bucketing matched / discrepant /
// external-only / EMR-only entries.

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/observability/log";
import { loadDrugEcosystemConfig } from "@/lib/integrations/drug-ecosystem/config";
import {
  MedicationHistoryClient,
  MedicationHistoryError,
  createMockMedicationHistoryTransport,
  reconcile,
} from "@/lib/integrations/drug-ecosystem/medication-history";

const inputSchema = z.object({
  patient: z.object({
    identifier: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    gender: z.enum(["M", "F", "U"]),
  }),
  prescriberNpi: z.string(),
  windowDays: z.number().int().positive().optional(),
  emrMedications: z
    .array(
      z.object({
        id: z.string(),
        rxcui: z.string().optional(),
        drugDescription: z.string(),
        quantity: z.number(),
        daysSupply: z.number(),
        lastFilledOn: z.string().optional(),
      }),
    )
    .optional(),
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
  const client = new MedicationHistoryClient({
    endpoint: config.surescripts.endpoint,
    apiKey: config.surescripts.apiKey,
    accountId: config.surescripts.accountId,
    fetchImpl: config.surescripts.configured
      ? undefined
      : createMockMedicationHistoryTransport(),
  });

  try {
    const history = await client.fetch({
      patient: body.patient,
      prescriberNpi: body.prescriberNpi,
      windowDays: body.windowDays,
    });

    const reconciliation = body.emrMedications
      ? reconcile(body.emrMedications, history.dispenses)
      : null;

    logger.info({
      event: "medication_history.fetch.success",
      dispenses: history.dispenses.length,
      reconciled: Boolean(reconciliation),
      mock: !config.surescripts.configured,
    });

    return NextResponse.json({
      history,
      reconciliation,
      mock: !config.surescripts.configured,
    });
  } catch (err) {
    logger.warn({ event: "medication_history.fetch.failed", error: err });
    if (err instanceof MedicationHistoryError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Medication history lookup failed" },
      { status: 500 },
    );
  }
}
