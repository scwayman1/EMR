import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { calculateTotal, type SuperbillData } from "@/lib/domain/superbill";
import { SuperbillView } from "./superbill-view";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Superbill" };

export default async function SuperbillPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
    include: {
      coverages: {
        where: { active: true, type: "primary" },
        take: 1,
      },
    },
  });

  if (!patient) notFound();

  // Load the latest completed encounter with notes and coding suggestions
  const encounter = await prisma.encounter.findFirst({
    where: {
      patientId: params.id,
      status: { in: ["complete", "in_progress"] },
    },
    include: {
      notes: {
        where: { status: "finalized" },
        include: { codingSuggestion: true },
        orderBy: { finalizedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Load provider separately if encounter has providerId
  const provider = encounter?.providerId
    ? await prisma.provider.findUnique({
        where: { id: encounter.providerId },
        include: { user: true },
      })
    : null;
  const providerUser = provider?.user;

  // Load charges for this encounter
  const charges = encounter
    ? await prisma.charge.findMany({
        where: { encounterId: encounter.id },
      })
    : [];

  // Extract coding suggestions from the latest note
  const latestNote = encounter?.notes?.[0];
  const codingSuggestion = latestNote?.codingSuggestion;
  const icd10Codes = codingSuggestion?.icd10 as
    | { code: string; label: string; confidence?: number }[]
    | null;

  // Build diagnoses from ICD-10 suggestions
  const diagnoses = (icd10Codes ?? []).map((c) => ({
    code: c.code,
    description: c.label,
  }));

  // Build procedures from charges or use E/M level
  const emLevel = codingSuggestion?.emLevel;
  const procedures: SuperbillData["procedures"] = [];

  if (charges.length > 0) {
    for (const charge of charges) {
      procedures.push({
        cptCode: charge.cptCode,
        description: charge.cptDescription ?? charge.cptCode,
        units: charge.units,
        fee: charge.feeAmountCents,
      });
    }
  } else if (emLevel) {
    // Fall back to E/M level suggestion
    const emFees: Record<string, number> = {
      "99211": 3500,
      "99212": 6500,
      "99213": 10000,
      "99214": 15000,
      "99215": 21500,
      "99201": 7500,
      "99202": 11000,
      "99203": 16500,
      "99204": 25000,
      "99205": 32500,
    };
    procedures.push({
      cptCode: emLevel,
      description: `E/M ${emLevel}`,
      units: 1,
      fee: emFees[emLevel] ?? 10000,
    });
  }

  const totalCharges = calculateTotal(procedures);
  const coverage = patient.coverages[0];

  // Build the superbill data object
  const superbillData: SuperbillData = {
    // Practice info
    practiceName: user.organizationName ?? "Leafjourney Cannabis Care",
    practiceAddress: "123 Wellness Blvd, Suite 200",
    practicePhone: "(555) 420-CARE",
    practiceNpi: "1234567890",
    practiceTaxId: "12-3456789",

    // Provider
    providerName: providerUser
      ? `${provider?.title ?? "Dr."} ${providerUser.firstName} ${providerUser.lastName}`
      : `${user.firstName} ${user.lastName}`,
    providerNpi: "9876543210",
    providerCredentials: provider?.title ?? "MD",

    // Patient
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientDob: patient.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    patientAddress: [
      patient.addressLine1,
      patient.city,
      patient.state,
      patient.postalCode,
    ]
      .filter(Boolean)
      .join(", "),
    patientPhone: patient.phone ?? "",
    patientId: patient.id.slice(0, 12).toUpperCase(),
    insuranceName: coverage?.payerName,
    insuranceId: coverage?.memberId,
    groupNumber: coverage?.groupNumber ?? undefined,

    // Visit
    dateOfService:
      encounter?.completedAt?.toISOString().slice(0, 10) ??
      encounter?.scheduledFor?.toISOString().slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    placeOfService:
      encounter?.placeOfService ??
      (encounter?.modality === "video" ? "02" : "11"),
    encounterType: encounter?.modality ?? "in_person",
    referringProvider: undefined,
    priorAuthNumber: undefined,

    // Diagnoses & Procedures
    diagnoses,
    procedures,

    // Totals
    totalCharges,
    copayCollected: coverage?.copayCents ?? undefined,
    amountDue:
      totalCharges - (coverage?.copayCents ?? 0) > 0
        ? totalCharges - (coverage?.copayCents ?? 0)
        : 0,

    // Signature
    providerSignature: false,
    signatureDate: undefined,
  };

  return (
    <PageShell maxWidth="max-w-[900px]">
      <SuperbillView data={superbillData} patientId={params.id} />
    </PageShell>
  );
}
