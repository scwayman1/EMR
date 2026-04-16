// Seed the database with a demo organization, a clinician, a patient, and
// enough data to make every surface of the app feel alive in local dev.
//
// Run with: npm run db:seed

import { PrismaClient, Role, PatientStatus, EncounterStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { decomposePrompt } from "../src/lib/agents/product-manager-agent";

const prisma = new PrismaClient();

const PATEL_001_RAW = `for billing and insurance module, begin structuring a full tier system
of cannabis medications and current products to determine which ones
are covered, which cannabis products will need a prior authorization,
and which alternatives are recommended if the current cannabis
medication is not covered by their insurance. We want our EMR to serve
as a fully functional system where providers can prescribe cannabis
exactly as they would a pharmaceutical pills and then have it
integrated into i`;

async function main() {
  console.log("Seeding demo organization...");

  const org = await prisma.organization.upsert({
    where: { slug: "leafjourney" },
    update: {},
    create: {
      name: "Leafjourney",
      slug: "leafjourney",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 12);

  // Practice owner / operator
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.health" },
    update: {},
    create: {
      email: "owner@demo.health",
      passwordHash,
      firstName: "Avery",
      lastName: "Hale",
      memberships: {
        create: [
          { organizationId: org.id, role: Role.practice_owner },
          { organizationId: org.id, role: Role.operator },
        ],
      },
    },
  });

  // Clinician
  const clinicianUser = await prisma.user.upsert({
    where: { email: "clinician@demo.health" },
    update: {},
    create: {
      email: "clinician@demo.health",
      passwordHash,
      firstName: "Dr. Lena",
      lastName: "Okafor",
      memberships: {
        create: { organizationId: org.id, role: Role.clinician },
      },
    },
  });

  await prisma.provider.upsert({
    where: { userId: clinicianUser.id },
    update: {},
    create: {
      userId: clinicianUser.id,
      organizationId: org.id,
      title: "MD, Integrative Oncology",
      specialties: ["oncology", "pain management", "palliative care"],
      bio: "Board-certified integrative oncologist focused on symptom management and cannabis-assisted therapy.",
    },
  });

  // Patient
  const patientUser = await prisma.user.upsert({
    where: { email: "patient@demo.health" },
    update: {},
    create: {
      email: "patient@demo.health",
      passwordHash,
      firstName: "Maya",
      lastName: "Reyes",
      memberships: {
        create: { organizationId: org.id, role: Role.patient },
      },
    },
  });

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      organizationId: org.id,
      status: PatientStatus.active,
      firstName: "Maya",
      lastName: "Reyes",
      dateOfBirth: new Date("1986-04-12"),
      email: "patient@demo.health",
      phone: "+1 415 555 0142",
      city: "Oakland",
      state: "CA",
      presentingConcerns: "Chronic neuropathic pain and sleep disturbance following chemotherapy.",
      treatmentGoals: "Reduce nighttime pain, improve sleep continuity, minimize opioid reliance.",
      cannabisHistory: {
        priorUse: true,
        formats: ["tincture", "vape"],
        reportedBenefits: ["better sleep onset"],
        reportedSideEffects: ["mild dry mouth"],
      },
      intakeAnswers: {
        symptoms: { pain: 7, sleep: 4, anxiety: 5 },
        completedSteps: ["demographics", "history", "goals"],
      },
    },
  });

  // Chart summary (what the Intake Agent would produce)
  await prisma.chartSummary.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      patientId: patient.id,
      completenessScore: 78,
      missingFields: ["current medications", "recent labs"],
      generatedBy: "agent:intake@1.0.0",
      summaryMd: `## Maya Reyes, 38F

**Presenting:** Neuropathic pain (7/10) and sleep disturbance (4/10) post-chemotherapy.

**Goals:** Reduce nighttime pain, improve sleep, minimize opioid use.

**Cannabis history:** Prior tincture and vape use; reports improved sleep onset, mild dry mouth.

**Gaps:** Current medication list not yet provided. No recent labs uploaded.
`,
    },
  });

  // Sample outcome logs over the past 10 days
  const metrics = ["pain", "sleep", "anxiety"] as const;
  const now = Date.now();
  for (let day = 10; day >= 0; day--) {
    for (const metric of metrics) {
      await prisma.outcomeLog.create({
        data: {
          patientId: patient.id,
          metric,
          value: 3 + Math.random() * 4,
          loggedAt: new Date(now - day * 86400000),
        },
      });
    }
  }

  // A scheduled upcoming visit
  await prisma.encounter.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      providerId: (await prisma.provider.findFirstOrThrow({ where: { organizationId: org.id } })).id,
      status: EncounterStatus.scheduled,
      scheduledFor: new Date(now + 3 * 86400000),
      modality: "video",
      reason: "Initial cannabis therapy consultation",
    },
  });

  // Seed the PHQ-9 and GAD-7 assessments
  await prisma.assessment.upsert({
    where: { slug: "phq-9" },
    update: {},
    create: {
      slug: "phq-9",
      title: "PHQ-9",
      description: "Patient Health Questionnaire — depression screening.",
      schema: { items: 9, scale: "0-3" },
    },
  });
  await prisma.assessment.upsert({
    where: { slug: "gad-7" },
    update: {},
    create: {
      slug: "gad-7",
      title: "GAD-7",
      description: "Generalized Anxiety Disorder scale.",
      schema: { items: 7, scale: "0-3" },
    },
  });
  await prisma.assessment.upsert({
    where: { slug: "pain-vas" },
    update: {},
    create: {
      slug: "pain-vas",
      title: "Pain VAS",
      description: "Visual analog pain scale (0-10).",
      schema: { items: 1, scale: "0-10" },
    },
  });

  // Practice launch status
  await prisma.practiceLaunchStatus.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      readinessScore: 72,
      blockers: ["Provider credentialing pending state verification"],
      nextSteps: [
        "Confirm first clinic hours",
        "Invite intake operator",
        "Review consent templates",
      ],
    },
  });

  // ------------------------------------------------------------
  // Mallik seed: Dr. Patel's first product prompt, pre-decomposed
  // so /ops/product-prompts has real content on first load.
  // ------------------------------------------------------------
  const patel001 = decomposePrompt({
    rawText: PATEL_001_RAW,
    source: "imessage",
    author: "dr_patel",
  });

  await prisma.productPrompt.upsert({
    where: { id: "seed-patel-001" },
    update: {},
    create: {
      id: "seed-patel-001",
      organizationId: org.id,
      source: "imessage",
      author: "dr_patel",
      rawText: PATEL_001_RAW,
      status: "decomposed",
      processedAt: new Date(),
      epicSlug: patel001.epicSlug,
      epicTitle: patel001.epicTitle,
      summary: patel001.summary,
      cards: patel001.cards as any,
      openQuestions: patel001.openQuestions as any,
      decomposedBy: "agent:mallik@1.0.0",
    },
  });

  console.log("Seed complete.");
  console.log("  Owner:     owner@demo.health     / password123");
  console.log("  Clinician: clinician@demo.health / password123");
  console.log("  Patient:   patient@demo.health   / password123");
  console.log(
    `  Mallik:    seeded patel-001 → ${patel001.cards.length} cards, ${patel001.openQuestions.length} open questions`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
