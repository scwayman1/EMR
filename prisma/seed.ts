// Seed the database with a demo organization, clinicians, patients, and
// enough data to make every surface of the app feel alive in local dev.
//
// Run with: npm run db:seed
//
// The seed is fully idempotent — safe to run multiple times.

import {
  Prisma,
  PrismaClient,
  Role,
  PatientStatus,
  EncounterStatus,
  NoteStatus,
  DocumentKind,
  MessageStatus,
  TaskStatus,
  AgentJobStatus,
  ProductType,
  DeliveryRoute,
  MedicationType,
  AppointmentStatus,
  ClaimStatus,
  PaymentSource,
  FinancialEventType,
  StatementStatus,
  PaymentPlanStatus,
  CoverageType,
  EligibilityStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const now = Date.now();

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Deterministic date relative to "now". */
function daysAgo(n: number): Date {
  return new Date(now - n * DAY_MS);
}
function daysFromNow(n: number): Date {
  return new Date(now + n * DAY_MS);
}

/** Delete rows that would clash on re-seed (non-upsertable tables). */
async function cleanIdempotent() {
  // OutcomeLogs, Messages, Documents, Notes, Encounters, Tasks, AgentJobs,
  // AssessmentResponses, and MessageThreads don't have natural unique keys,
  // so we delete-and-recreate. We scope deletions to our demo org to be safe.
  const org = await prisma.organization.findUnique({
    where: { slug: "green-path-health" },
  });
  if (!org) return; // first run — nothing to clean

  // Order matters because of FK constraints
  await prisma.patientMedication.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.doseLog.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.dosingRegimen.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.cannabisProduct.deleteMany({
    where: { organizationId: org.id },
  });
  await prisma.codingSuggestion.deleteMany({
    where: { note: { encounter: { organizationId: org.id } } },
  });
  await prisma.note.deleteMany({
    where: { encounter: { organizationId: org.id } },
  });
  await prisma.document.deleteMany({ where: { organizationId: org.id } });
  await prisma.encounter.deleteMany({ where: { organizationId: org.id } });
  await prisma.message.deleteMany({
    where: { thread: { patient: { organizationId: org.id } } },
  });
  await prisma.messageThread.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.assessmentResponse.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.outcomeLog.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.task.deleteMany({ where: { organizationId: org.id } });
  await prisma.agentJob.deleteMany({ where: { organizationId: org.id } });
  await prisma.appointment.deleteMany({
    where: { patient: { organizationId: org.id } },
  });

  // ── Billing tables (Phase 1-3) ─────────────────────────────────
  // FK order: payments → financial events → claims → statements →
  // payment plans → coverage → stored payment methods.
  // Statement.statementNumber has @unique so we MUST clean these up
  // or the seed crashes on duplicate inserts every deploy.
  await prisma.payment.deleteMany({
    where: { claim: { organizationId: org.id } },
  });
  await prisma.financialEvent.deleteMany({
    where: { organizationId: org.id },
  });
  await prisma.claim.deleteMany({ where: { organizationId: org.id } });
  await prisma.statement.deleteMany({ where: { organizationId: org.id } });
  await prisma.paymentPlan.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.patientCoverage.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.storedPaymentMethod.deleteMany({
    where: { patient: { organizationId: org.id } },
  });
  await prisma.feeScheduleEntry.deleteMany({
    where: { organizationId: org.id },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Cleaning previous seed data...");
  await cleanIdempotent();

  console.log("Seeding demo organization...");

  // ------------------------------------------------------------------
  // Organization
  // ------------------------------------------------------------------
  const org = await prisma.organization.upsert({
    where: { slug: "green-path-health" },
    update: {},
    create: {
      name: "Green Path Health",
      slug: "green-path-health",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 12);

  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------

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

  const provider = await prisma.provider.upsert({
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

  // ------------------------------------------------------------------
  // Patient 1 — Maya Reyes (active, richest record)
  // ------------------------------------------------------------------
  const mayaUser = await prisma.user.upsert({
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

  const maya = await prisma.patient.upsert({
    where: { userId: mayaUser.id },
    update: {},
    create: {
      userId: mayaUser.id,
      organizationId: org.id,
      status: PatientStatus.active,
      firstName: "Maya",
      lastName: "Reyes",
      dateOfBirth: new Date("1986-04-12"),
      email: "patient@demo.health",
      phone: "+1 415 555 0142",
      addressLine1: "742 Evergreen Terrace",
      city: "Oakland",
      state: "CA",
      postalCode: "94612",
      presentingConcerns:
        "Chronic neuropathic pain and sleep disturbance following chemotherapy.",
      treatmentGoals:
        "Reduce nighttime pain, improve sleep continuity, minimize opioid reliance.",
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

  // Chart summary
  await prisma.chartSummary.upsert({
    where: { patientId: maya.id },
    update: {},
    create: {
      patientId: maya.id,
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

  // Maya — Outcome logs (past 10 days, pain/sleep/anxiety)
  const mayaMetrics = ["pain", "sleep", "anxiety"] as const;
  for (let day = 10; day >= 0; day--) {
    for (const metric of mayaMetrics) {
      await prisma.outcomeLog.create({
        data: {
          patientId: maya.id,
          metric,
          value: parseFloat((3 + Math.random() * 4).toFixed(1)),
          loggedAt: daysAgo(day),
        },
      });
    }
  }

  // Maya — 2 encounters: 1 completed 7 days ago, 1 scheduled 3 days from now
  const mayaCompletedEncounter = await prisma.encounter.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      providerId: provider.id,
      status: EncounterStatus.complete,
      scheduledFor: daysAgo(7),
      startedAt: daysAgo(7),
      completedAt: daysAgo(7),
      modality: "video",
      reason: "Initial cannabis therapy consultation",
    },
  });

  await prisma.encounter.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      providerId: provider.id,
      status: EncounterStatus.scheduled,
      scheduledFor: daysFromNow(3),
      modality: "video",
      reason: "Follow-up: dosage adjustment and sleep review",
    },
  });

  // Maya — Finalized note on the completed encounter
  await prisma.note.create({
    data: {
      encounterId: mayaCompletedEncounter.id,
      authorUserId: clinicianUser.id,
      status: NoteStatus.finalized,
      aiDrafted: true,
      aiConfidence: 0.92,
      finalizedAt: daysAgo(7),
      blocks: [
        {
          type: "summary",
          heading: "Summary",
          body: "38F with chronic neuropathic pain and sleep disturbance post-chemotherapy. Prior cannabis experience with tinctures and vape cartridges.",
        },
        {
          type: "findings",
          heading: "Relevant Findings",
          body: "Pain 7/10, sleep quality 4/10, anxiety 5/10. Currently using OTC ibuprofen PRN. No current prescription cannabis.",
        },
        {
          type: "assessment",
          heading: "Assessment",
          body: "Chronic neuropathic pain syndrome with secondary insomnia. Good candidate for cannabis-assisted therapy given prior positive response and minimal side effects.",
        },
        {
          type: "plan",
          heading: "Plan",
          body: "Start low-THC:high-CBD tincture (5mg THC / 20mg CBD) 1 hour before bedtime. Keep pain/sleep diary. Upload recent labs before next visit.",
        },
        {
          type: "followUp",
          heading: "Follow-up",
          body: "Video follow-up in 2 weeks to assess response and titrate if needed.",
        },
      ],
      narrative: null,
    },
  });

  // Maya — 3 documents
  await prisma.document.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      kind: DocumentKind.lab,
      originalName: "Lab_Results_CBC.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245_760,
      storageKey: `docs/${org.id}/${maya.id}/lab_results_cbc.pdf`,
      tags: ["lab", "CBC"],
      aiClassified: true,
      aiTags: ["complete blood count", "hematology"],
      aiConfidence: 0.95,
      needsReview: false,
      createdAt: daysAgo(14),
    },
  });
  await prisma.document.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      kind: DocumentKind.letter,
      originalName: "Oncology_Referral_Letter.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128_000,
      storageKey: `docs/${org.id}/${maya.id}/oncology_referral_letter.pdf`,
      tags: ["referral", "oncology"],
      aiClassified: true,
      aiTags: ["referral letter", "oncology", "integrative medicine"],
      aiConfidence: 0.88,
      needsReview: false,
      createdAt: daysAgo(21),
    },
  });
  await prisma.document.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      kind: DocumentKind.image,
      originalName: "Sleep_Diary_Photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1_024_000,
      storageKey: `docs/${org.id}/${maya.id}/sleep_diary_photo.jpg`,
      tags: [],
      aiClassified: false,
      aiTags: [],
      aiConfidence: null,
      needsReview: true,
      createdAt: daysAgo(3),
    },
  });

  // Maya — 3 assessment responses (PHQ-9, GAD-7, Pain VAS)
  const phq9 = await prisma.assessment.upsert({
    where: { slug: "phq-9" },
    update: {},
    create: {
      slug: "phq-9",
      title: "PHQ-9",
      description: "Patient Health Questionnaire — depression screening.",
      schema: { items: 9, scale: "0-3" },
    },
  });
  const gad7 = await prisma.assessment.upsert({
    where: { slug: "gad-7" },
    update: {},
    create: {
      slug: "gad-7",
      title: "GAD-7",
      description: "Generalized Anxiety Disorder scale.",
      schema: { items: 7, scale: "0-3" },
    },
  });
  const painVas = await prisma.assessment.upsert({
    where: { slug: "pain-vas" },
    update: {},
    create: {
      slug: "pain-vas",
      title: "Pain VAS",
      description: "Visual analog pain scale (0-10).",
      schema: { items: 1, scale: "0-10" },
    },
  });
  const sleepQuality = await prisma.assessment.upsert({
    where: { slug: "sleep-quality" },
    update: {},
    create: {
      slug: "sleep-quality",
      title: "Sleep Quality",
      description:
        "Pittsburgh Sleep Quality Index — subjective sleep quality screening.",
      schema: { items: 7, scale: "0-3" },
    },
  });

  // EMR-066: validated assessment library expansion
  const expandedAssessments = [
    { slug: "isi", title: "ISI (Insomnia)", description: "Insomnia Severity Index — 7-item sleep difficulty screen.", schema: { items: 7, scale: "0-4" } },
    { slug: "pss-10", title: "PSS-10 (Stress)", description: "Perceived Stress Scale — 10 items, past month.", schema: { items: 10, scale: "0-4" } },
    { slug: "epworth", title: "Epworth Sleepiness Scale", description: "Daytime sleepiness across 8 daily situations.", schema: { items: 8, scale: "0-3" } },
    { slug: "audit-c", title: "AUDIT-C (Alcohol)", description: "3-item alcohol use screen.", schema: { items: 3, scale: "0-4" } },
    { slug: "cudit-r", title: "CUDIT-R (Cannabis Use)", description: "Cannabis Use Disorders Identification Test (revised).", schema: { items: 8, scale: "0-4" } },
    { slug: "promis-pain", title: "PROMIS Pain Interference", description: "6-item pain interference, past week.", schema: { items: 6, scale: "1-5" } },
    { slug: "phq-2", title: "PHQ-2 (Quick Depression Screen)", description: "Two-question rapid depression screen.", schema: { items: 2, scale: "0-3" } },
  ];
  for (const a of expandedAssessments) {
    await prisma.assessment.upsert({
      where: { slug: a.slug },
      update: {},
      create: a,
    });
  }

  await prisma.assessmentResponse.create({
    data: {
      assessmentId: phq9.id,
      patientId: maya.id,
      answers: [1, 1, 2, 1, 0, 1, 1, 0, 1],
      score: 8,
      interpretation: "Mild depression",
      submittedAt: daysAgo(7),
    },
  });
  await prisma.assessmentResponse.create({
    data: {
      assessmentId: gad7.id,
      patientId: maya.id,
      answers: [2, 2, 2, 2, 1, 2, 1],
      score: 12,
      interpretation: "Moderate anxiety",
      submittedAt: daysAgo(7),
    },
  });
  await prisma.assessmentResponse.create({
    data: {
      assessmentId: painVas.id,
      patientId: maya.id,
      answers: [6],
      score: 6,
      interpretation: "Moderate pain",
      submittedAt: daysAgo(7),
    },
  });

  // ────────────────────────────────────────────────────────────
  // Maya — 4 distinct message threads showcasing Correspondence Nurse
  // triage (dosing, side effect, gratitude, refill)
  // ────────────────────────────────────────────────────────────

  // Thread 1: Dosing question (resolved) — shows a classic back-and-forth
  const mayaThread = await prisma.messageThread.create({
    data: {
      patientId: maya.id,
      subject: "Dosing question — tincture + evening ibuprofen",
      lastMessageAt: daysAgo(2),
      triageUrgency: "routine",
      triageCategory: "dosing_question",
      triageSafetyFlags: [],
      triageSummary:
        "Maya asked about route of administration for her THC:CBD tincture and whether it's safe with her evening ibuprofen. Resolved.",
      triagedAt: daysAgo(3),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.read,
      body: "Hi Maya! Welcome to Green Path Health. I'm Dr. Okafor and I'll be your care provider. Feel free to reach out any time with questions about your treatment plan.",
      aiDrafted: false,
      sentAt: daysAgo(5),
      createdAt: daysAgo(5),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaThread.id,
      senderUserId: mayaUser.id,
      status: MessageStatus.read,
      body: "Thank you Dr. Okafor! Quick question — for the tincture you recommended, should I take it sublingually or can I add it to tea? Also, is it okay to take it with my evening ibuprofen?",
      aiDrafted: false,
      sentAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.sent,
      body: "Great questions! Sublingual is preferred — hold it under your tongue for 60-90 seconds before swallowing for the fastest absorption (15-20 min to onset). Adding it to tea works too but onset will be slower (45-60 min). Taking it alongside ibuprofen is fine at this dose. Let me know how your first week goes.",
      aiDrafted: false,
      sentAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
  });

  // Thread 2: Side effect report — NEEDS PROVIDER REVIEW (AI draft ready)
  const mayaSideEffectThread = await prisma.messageThread.create({
    data: {
      patientId: maya.id,
      subject: "Feeling groggy in the mornings",
      lastMessageAt: daysAgo(0),
      triageUrgency: "high",
      triageCategory: "side_effect",
      triageSafetyFlags: [],
      triageSummary:
        "Maya reports morning grogginess on her current 5mg THC + 2.5mg CBN bedtime tincture. Pain is improving but she feels 'drugged' until 10am. May need dose reduction or earlier timing.",
      triagedAt: daysAgo(0),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaSideEffectThread.id,
      senderUserId: mayaUser.id,
      status: MessageStatus.sent,
      body: "Hi Dr. Okafor, I wanted to check in. The tincture has been helping my pain a lot (down to about a 3 from a 6), and I'm sleeping better too — thank you! But I've been feeling pretty groggy in the mornings, like I can't shake it until 10am or so. Is this normal? Should I be worried?",
      aiDrafted: false,
      sentAt: daysAgo(0),
      createdAt: daysAgo(0),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaSideEffectThread.id,
      status: MessageStatus.draft,
      body: "Hi Maya — really glad to hear your pain is down to a 3 and your sleep is improving. The morning grogginess you're describing is a common effect of the CBN in your bedtime tincture, especially in the first 1-2 weeks as your body adjusts. A few things we can try: (1) move your dose to 60-90 min before bed instead of right before sleep — this gives the CBN more time to peak and wear off by morning, (2) if it's still happening next week, we can drop the CBN component by half. Nothing to worry about, but I want to hear how it's going. Can you give it a few nights with the earlier timing and message me on Monday?",
      aiDrafted: true,
      senderAgent: "correspondenceNurse:1.0.0",
      createdAt: daysAgo(0),
    },
  });

  // Thread 3: Gratitude / positive update — LOW urgency
  const mayaGratitudeThread = await prisma.messageThread.create({
    data: {
      patientId: maya.id,
      subject: "First pain-free day!",
      lastMessageAt: daysAgo(6),
      triageUrgency: "low",
      triageCategory: "gratitude",
      triageSafetyFlags: [],
      triageSummary:
        "Maya reports her first pain-free day since starting cannabis therapy. Positive update — reinforce and encourage.",
      triagedAt: daysAgo(6),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaGratitudeThread.id,
      senderUserId: mayaUser.id,
      status: MessageStatus.read,
      body: "I had to share — yesterday was my first pain-free day in 8 months. I took my daughter to the park and walked 3 miles without stopping. I literally cried in the car afterward. Thank you for everything.",
      aiDrafted: false,
      sentAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaGratitudeThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.sent,
      body: "Maya, this message made my whole week. Three miles with your daughter — that's exactly what this is all for. Keep logging your check-ins so we can see the pattern. So proud of you.",
      aiDrafted: false,
      sentAt: daysAgo(6),
      createdAt: daysAgo(6),
    },
  });

  // Thread 4: Refill request — ROUTINE
  const mayaRefillThread = await prisma.messageThread.create({
    data: {
      patientId: maya.id,
      subject: "Running low on my tincture",
      lastMessageAt: daysAgo(1),
      triageUrgency: "routine",
      triageCategory: "refill_request",
      triageSafetyFlags: [],
      triageSummary:
        "Maya has about 5 days of tincture left. Standard refill. Last 30-day adherence was 92% (good). Safe to refill.",
      triagedAt: daysAgo(1),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaRefillThread.id,
      senderUserId: mayaUser.id,
      status: MessageStatus.sent,
      body: "Hi! I have about 5 days of tincture left and wanted to request a refill. Same pharmacy as last time. Thanks!",
      aiDrafted: false,
      sentAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
  });
  await prisma.message.create({
    data: {
      threadId: mayaRefillThread.id,
      status: MessageStatus.draft,
      body: "Hi Maya, refill authorized and being sent to your usual pharmacy today — should be ready tomorrow afternoon. Your adherence has been excellent (92% the last 30 days, which is impressive) and your pain trend is moving in the right direction, so we'll keep the regimen exactly as-is. You'll get a text from the pharmacy when it's ready.",
      aiDrafted: true,
      senderAgent: "correspondenceNurse:1.0.0",
      createdAt: daysAgo(1),
    },
  });

  // Maya — 5 tasks (2 completed, 2 open, 1 snoozed)
  await prisma.task.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      title: "Upload current medication list",
      description:
        "Patient needs to provide a list of all current medications including OTC supplements.",
      status: TaskStatus.open,
      assigneeRole: Role.patient,
      assigneeUserId: mayaUser.id,
      dueAt: daysFromNow(5),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      title: "Complete sleep quality assessment",
      description: "Complete the Pittsburgh Sleep Quality Index questionnaire.",
      status: TaskStatus.open,
      assigneeRole: Role.patient,
      assigneeUserId: mayaUser.id,
      dueAt: daysFromNow(7),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      title: "Review initial intake form",
      description: "Clinician to review Maya's completed intake answers.",
      status: TaskStatus.done,
      assigneeRole: Role.clinician,
      assigneeUserId: clinicianUser.id,
      completedAt: daysAgo(8),
      createdAt: daysAgo(14),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      title: "Classify uploaded sleep diary image",
      description: "AI document organizer should classify Sleep_Diary_Photo.jpg.",
      status: TaskStatus.done,
      assigneeRole: Role.system,
      completedAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      title: "Follow up on lab results interpretation",
      description:
        "Waiting for oncology team to provide interpretation of CBC results before next visit.",
      status: TaskStatus.snoozed,
      assigneeRole: Role.clinician,
      assigneeUserId: clinicianUser.id,
      dueAt: daysFromNow(10),
      createdAt: daysAgo(10),
    },
  });

  // ------------------------------------------------------------------
  // Patient 2 — James Chen (active)
  // ------------------------------------------------------------------
  const jamesUser = await prisma.user.upsert({
    where: { email: "james.chen@demo.health" },
    update: {},
    create: {
      email: "james.chen@demo.health",
      passwordHash,
      firstName: "James",
      lastName: "Chen",
      memberships: {
        create: { organizationId: org.id, role: Role.patient },
      },
    },
  });

  const james = await prisma.patient.upsert({
    where: { userId: jamesUser.id },
    update: {},
    create: {
      userId: jamesUser.id,
      organizationId: org.id,
      status: PatientStatus.active,
      firstName: "James",
      lastName: "Chen",
      dateOfBirth: new Date("1978-11-03"),
      email: "james.chen@demo.health",
      phone: "+1 510 555 0198",
      addressLine1: "88 Lakeshore Ave",
      city: "San Francisco",
      state: "CA",
      postalCode: "94110",
      presentingConcerns:
        "Chronic insomnia and anxiety post-surgery. Difficulty falling asleep and staying asleep; generalized anxiety that worsened after knee replacement surgery 6 months ago.",
      treatmentGoals:
        "Improve sleep onset and duration, reduce reliance on anxiety medications, explore cannabis-based alternatives.",
      cannabisHistory: {
        priorUse: true,
        formats: ["edibles", "tinctures"],
        reportedBenefits: ["relaxation", "sleep onset improvement"],
        reportedSideEffects: ["occasional grogginess next morning"],
      },
      intakeAnswers: {
        symptoms: { sleep: 3, anxiety: 7, pain: 2 },
        completedSteps: ["demographics", "history", "goals"],
      },
    },
  });

  // James — Chart summary at 62%
  await prisma.chartSummary.upsert({
    where: { patientId: james.id },
    update: {},
    create: {
      patientId: james.id,
      completenessScore: 62,
      missingFields: [
        "surgical history details",
        "current anxiety medication list",
        "recent sleep study results",
      ],
      generatedBy: "agent:intake@1.0.0",
      summaryMd: `## James Chen, 47M

**Presenting:** Chronic insomnia and generalized anxiety following knee replacement surgery 6 months ago.

**Goals:** Improve sleep, reduce anxiety medication reliance, explore cannabis alternatives.

**Cannabis history:** Prior edibles and tincture use; reports relaxation and better sleep onset. Occasional next-morning grogginess.

**Gaps:** Surgical history details missing. Anxiety medication list needed. No recent sleep study on file.
`,
    },
  });

  // James — 1 scheduled encounter
  await prisma.encounter.create({
    data: {
      organizationId: org.id,
      patientId: james.id,
      providerId: provider.id,
      status: EncounterStatus.scheduled,
      scheduledFor: daysFromNow(5),
      modality: "video",
      reason: "Initial consultation: insomnia and anxiety management",
    },
  });

  // James — Outcome logs for the last 7 days (sleep and anxiety)
  for (let day = 6; day >= 0; day--) {
    await prisma.outcomeLog.create({
      data: {
        patientId: james.id,
        metric: "sleep",
        value: parseFloat((2 + Math.random() * 3).toFixed(1)),
        loggedAt: daysAgo(day),
      },
    });
    await prisma.outcomeLog.create({
      data: {
        patientId: james.id,
        metric: "anxiety",
        value: parseFloat((5 + Math.random() * 3).toFixed(1)),
        loggedAt: daysAgo(day),
      },
    });
  }

  // ────────────────────────────────────────────────────────────
  // James — 3 threads showcasing the full triage spectrum including
  // an EMERGENCY flag (the single most important demonstration)
  // ────────────────────────────────────────────────────────────

  // Thread 1: Welcome / intake follow-up
  const jamesThread = await prisma.messageThread.create({
    data: {
      patientId: james.id,
      subject: "Welcome to Green Path Health",
      lastMessageAt: daysAgo(1),
      triageUrgency: "routine",
      triageCategory: "general_question",
      triageSafetyFlags: [],
      triageSummary: "New patient welcome thread. Intake in progress.",
      triagedAt: daysAgo(1),
    },
  });
  await prisma.message.create({
    data: {
      threadId: jamesThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.sent,
      body: "Hi James, welcome to Green Path Health! I'm Dr. Okafor. I've reviewed your intake so far and I'm looking forward to our consultation. In the meantime, please continue logging your sleep and anxiety levels daily so we have good baseline data.",
      aiDrafted: false,
      sentAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
  });

  // Thread 2: EMERGENCY — the headline demonstration
  // Patient mentions chest pain + shortness of breath. The Correspondence
  // Nurse MUST catch this and force "emergency" urgency regardless of
  // anything else. The draft must instruct the patient to call 911.
  const jamesEmergencyThread = await prisma.messageThread.create({
    data: {
      patientId: james.id,
      subject: "Chest pain — should I be worried?",
      lastMessageAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
      triageUrgency: "emergency",
      triageCategory: "symptom_report",
      triageSafetyFlags: [
        '🚨 Emergency keyword: "chest pain"',
        '🚨 Emergency keyword: "difficulty breathing"',
      ],
      triageSummary:
        "🚨 EMERGENCY — James reports chest pain and difficulty catching his breath after his morning dose. Must instruct him to call 911 or go to the ER immediately. Do not attempt to manage this in messaging.",
      triagedAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });
  await prisma.message.create({
    data: {
      threadId: jamesEmergencyThread.id,
      senderUserId: jamesUser.id,
      status: MessageStatus.sent,
      body: "I'm feeling some chest pain and having a little difficulty catching my breath. It started about 20 minutes after I took my morning dose. Should I be worried? Should I stop the medication?",
      aiDrafted: false,
      sentAt: new Date(Date.now() - 20 * 60 * 1000),
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  });
  await prisma.message.create({
    data: {
      threadId: jamesEmergencyThread.id,
      status: MessageStatus.draft,
      body:
        "James — I want you to stop what you're doing and call 911 or go to the nearest emergency room RIGHT NOW. Chest pain plus difficulty breathing can be a sign of a serious problem that I can't safely evaluate through a message. Don't drive yourself — call 911 or have someone drive you.\n\nOnce you're being seen, please have someone message me so I know you're safe. We'll figure out what happened and adjust your care together afterward, but the priority right now is getting you in front of an ER doctor.",
      aiDrafted: true,
      senderAgent: "correspondenceNurse:1.0.0",
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  // Thread 3: Billing question — routine
  const jamesBillingThread = await prisma.messageThread.create({
    data: {
      patientId: james.id,
      subject: "Question about my bill",
      lastMessageAt: daysAgo(4),
      triageUrgency: "routine",
      triageCategory: "billing_question",
      triageSafetyFlags: [],
      triageSummary:
        "James is confused about a $64 patient responsibility charge on his recent Aetna EOB. This is his plan's deductible share on a 99204 visit. Needs plain-language explanation.",
      triagedAt: daysAgo(4),
    },
  });
  await prisma.message.create({
    data: {
      threadId: jamesBillingThread.id,
      senderUserId: jamesUser.id,
      status: MessageStatus.read,
      body: "Hi, I got a bill for $64 from my visit a few weeks ago and I'm confused. I thought Aetna covered everything. Can someone explain what this is for?",
      aiDrafted: false,
      sentAt: daysAgo(5),
      createdAt: daysAgo(5),
    },
  });
  await prisma.message.create({
    data: {
      threadId: jamesBillingThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.sent,
      body: "Hi James, totally understandable question. Your plan with Aetna has a $3,000 annual deductible — that means you pay the first $3,000 before your plan starts fully covering things. The $64 goes toward that deductible, not to us beyond the network-allowed rate. Every dollar you pay counts toward meeting your deductible for the year. You can pay it directly through your patient portal billing tab. Let me know if you have other questions.",
      aiDrafted: false,
      sentAt: daysAgo(4),
      createdAt: daysAgo(4),
    },
  });

  // ------------------------------------------------------------------
  // Patient 3 — Sarah Thompson (prospect, intake just started)
  // ------------------------------------------------------------------
  const sarahUser = await prisma.user.upsert({
    where: { email: "sarah.thompson@demo.health" },
    update: {},
    create: {
      email: "sarah.thompson@demo.health",
      passwordHash,
      firstName: "Sarah",
      lastName: "Thompson",
      memberships: {
        create: { organizationId: org.id, role: Role.patient },
      },
    },
  });

  const sarah = await prisma.patient.upsert({
    where: { userId: sarahUser.id },
    update: {},
    create: {
      userId: sarahUser.id,
      organizationId: org.id,
      status: PatientStatus.prospect,
      firstName: "Sarah",
      lastName: "Thompson",
      dateOfBirth: new Date("1992-07-22"),
      email: "sarah.thompson@demo.health",
      phone: "+1 408 555 0276",
      city: "San Jose",
      state: "CA",
      postalCode: "95112",
      // No clinical data yet — prospect with only demographics
      presentingConcerns: null,
      treatmentGoals: null,
      cannabisHistory: Prisma.DbNull,
      intakeAnswers: {
        completedSteps: ["demographics"],
      },
    },
  });

  // Sarah — No chart summary (prospect)
  // Sarah — No encounters

  // Sarah — 1 task: Complete your intake
  await prisma.task.create({
    data: {
      organizationId: org.id,
      patientId: sarah.id,
      title: "Complete your intake",
      description:
        "Please finish filling out your intake form so we can prepare for your first consultation.",
      status: TaskStatus.open,
      assigneeRole: Role.patient,
      assigneeUserId: sarahUser.id,
      dueAt: daysFromNow(14),
    },
  });

  // ------------------------------------------------------------------
  // Agent Jobs (various states)
  // ------------------------------------------------------------------

  // Succeeded: Intake agent for Maya
  await prisma.agentJob.create({
    data: {
      organizationId: org.id,
      workflowName: "patient.intake",
      agentName: "intake-agent",
      eventName: "patient.intake.completed",
      input: { patientId: maya.id },
      output: { chartSummaryId: "generated", completeness: 78 },
      status: AgentJobStatus.succeeded,
      attempts: 1,
      startedAt: daysAgo(10),
      completedAt: daysAgo(10),
      createdAt: daysAgo(10),
    },
  });

  // Succeeded: Document organizer for Maya
  await prisma.agentJob.create({
    data: {
      organizationId: org.id,
      workflowName: "document.classify",
      agentName: "document-organizer-agent",
      eventName: "document.uploaded",
      input: { patientId: maya.id, documentName: "Lab_Results_CBC.pdf" },
      output: { kind: "lab", confidence: 0.95, tags: ["CBC", "hematology"] },
      status: AgentJobStatus.succeeded,
      attempts: 1,
      startedAt: daysAgo(14),
      completedAt: daysAgo(14),
      createdAt: daysAgo(14),
    },
  });

  // Needs approval: Messaging assistant draft for James
  await prisma.agentJob.create({
    data: {
      organizationId: org.id,
      workflowName: "messaging.draft",
      agentName: "messaging-assistant-agent",
      eventName: "message.draft.requested",
      input: {
        patientId: james.id,
        threadSubject: "Pre-visit preparation checklist",
      },
      output: {
        draftBody:
          "Hi James, here are a few things to prepare before your upcoming visit: (1) List all current medications including dosages, (2) Note your average sleep/wake times over the past week, (3) Write down any questions you'd like to discuss.",
      },
      status: AgentJobStatus.needs_approval,
      requiresApproval: true,
      approvalRequiredAt: daysAgo(1),
      attempts: 1,
      startedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
  });

  // Failed: Research query with no results
  await prisma.agentJob.create({
    data: {
      organizationId: org.id,
      workflowName: "research.query",
      agentName: "research-agent",
      eventName: "research.query.submitted",
      input: {
        queryText:
          "Efficacy of THCV isolate for post-surgical anxiety in adults over 60",
      },
      output: Prisma.DbNull,
      status: AgentJobStatus.failed,
      attempts: 3,
      maxAttempts: 3,
      lastError:
        "No relevant research results found after 3 attempts. The query may be too specific — consider broadening the search terms.",
      startedAt: daysAgo(2),
      completedAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
  });

  // Pending: Outcome tracker for Maya
  await prisma.agentJob.create({
    data: {
      organizationId: org.id,
      workflowName: "outcomes.weekly-summary",
      agentName: "outcome-tracker-agent",
      eventName: "outcomes.summary.scheduled",
      input: { patientId: maya.id, period: "weekly" },
      output: Prisma.DbNull,
      status: AgentJobStatus.pending,
      attempts: 0,
      runAfter: daysFromNow(1),
      createdAt: new Date(),
    },
  });

  // ------------------------------------------------------------------
  // Practice launch status
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Cannabis Products
  // ------------------------------------------------------------------
  console.log("Seeding cannabis products and dosing data...");

  const thcOil = await prisma.cannabisProduct.create({
    data: {
      organizationId: org.id,
      name: "THC Infused Oil 10mg/mL",
      productType: ProductType.oil,
      route: DeliveryRoute.sublingual,
      thcConcentration: 10,
      cbdConcentration: 0,
      thcCbdRatio: "10:0",
      concentrationUnit: "mg/mL",
    },
  });

  const balancedTincture = await prisma.cannabisProduct.create({
    data: {
      organizationId: org.id,
      name: "Balanced THC:CBD Tincture",
      productType: ProductType.tincture,
      route: DeliveryRoute.sublingual,
      thcConcentration: 5,
      cbdConcentration: 5,
      thcCbdRatio: "1:1",
      concentrationUnit: "mg/mL",
    },
  });

  const cbdCapsules = await prisma.cannabisProduct.create({
    data: {
      organizationId: org.id,
      name: "CBD Isolate Capsules 25mg",
      productType: ProductType.capsule,
      route: DeliveryRoute.oral,
      thcConcentration: 0,
      cbdConcentration: 25,
      thcCbdRatio: "0:1",
      concentrationUnit: "mg/unit",
    },
  });

  // ------------------------------------------------------------------
  // Dosing Regimen for Maya Reyes (balanced tincture)
  // ------------------------------------------------------------------
  const mayaRegimen = await prisma.dosingRegimen.create({
    data: {
      patientId: maya.id,
      productId: balancedTincture.id,
      prescribedById: clinicianUser.id,
      volumePerDose: 0.5,
      volumeUnit: "mL",
      frequencyPerDay: 2,
      timingInstructions: "Morning and 1 hour before bed",
      calculatedThcMgPerDose: 2.5,
      calculatedCbdMgPerDose: 2.5,
      calculatedThcMgPerDay: 5,
      calculatedCbdMgPerDay: 5,
      patientInstructions:
        "Take 0.5 mL (half a dropper) under the tongue twice daily — once in the morning and once before bed. Hold under tongue for 60 seconds before swallowing. This equals 2.5 mg THC + 2.5 mg CBD per dose (5 mg each per day).",
      clinicianNotes:
        "Starting low dose 1:1 for sleep and pain. Reassess in 2 weeks. May titrate up to 1 mL if tolerated.",
      startDate: daysAgo(3),
    },
  });

  // ------------------------------------------------------------------
  // Dose Logs for Maya (past 3 days)
  // ------------------------------------------------------------------
  // Day 3 ago — morning dose
  await prisma.doseLog.create({
    data: {
      patientId: maya.id,
      regimenId: mayaRegimen.id,
      actualVolume: 0.5,
      volumeUnit: "mL",
      estimatedThcMg: 2.5,
      estimatedCbdMg: 2.5,
      route: DeliveryRoute.sublingual,
      note: "First dose, no issues",
      loggedAt: daysAgo(3),
    },
  });
  // Day 2 ago — morning and evening doses
  await prisma.doseLog.create({
    data: {
      patientId: maya.id,
      regimenId: mayaRegimen.id,
      actualVolume: 0.5,
      volumeUnit: "mL",
      estimatedThcMg: 2.5,
      estimatedCbdMg: 2.5,
      route: DeliveryRoute.sublingual,
      note: "Morning dose, felt calm",
      loggedAt: daysAgo(2),
    },
  });
  await prisma.doseLog.create({
    data: {
      patientId: maya.id,
      regimenId: mayaRegimen.id,
      actualVolume: 0.5,
      volumeUnit: "mL",
      estimatedThcMg: 2.5,
      estimatedCbdMg: 2.5,
      route: DeliveryRoute.sublingual,
      note: "Evening dose, slept better",
      loggedAt: daysAgo(1),
    },
  });

  // ------------------------------------------------------------------
  // Maya — Conventional Medications
  // ------------------------------------------------------------------
  console.log("Seeding Maya's conventional medications...");

  await prisma.patientMedication.create({
    data: {
      patientId: maya.id,
      name: "Sertraline",
      genericName: "sertraline hydrochloride",
      type: MedicationType.prescription,
      dosage: "50mg daily",
      prescriber: "Dr. Patel (PCP)",
      active: true,
      startDate: daysAgo(90),
      notes: "For anxiety management. Stable dose for 3 months.",
    },
  });

  await prisma.patientMedication.create({
    data: {
      patientId: maya.id,
      name: "Melatonin",
      genericName: "melatonin",
      type: MedicationType.supplement,
      dosage: "3mg nightly",
      active: true,
      startDate: daysAgo(30),
      notes: "OTC supplement for sleep onset.",
    },
  });

  await prisma.patientMedication.create({
    data: {
      patientId: maya.id,
      name: "Acetaminophen",
      genericName: "acetaminophen",
      type: MedicationType.otc,
      dosage: "500mg as needed",
      active: true,
      startDate: daysAgo(60),
      notes: "PRN for breakthrough pain. Max 4g/day.",
    },
  });

  // ------------------------------------------------------------------
  // Practice Management — Fee Schedule, Appointments, Claims, Payments
  // ------------------------------------------------------------------

  // Fee schedule — common E&M and cannabis counseling codes
  const feeScheduleEntries = [
    { cptCode: "99203", description: "New patient visit, 30-44 min", defaultChargeCents: 28500, category: "E&M" },
    { cptCode: "99204", description: "New patient visit, 45-59 min", defaultChargeCents: 42500, category: "E&M" },
    { cptCode: "99205", description: "New patient visit, 60-74 min", defaultChargeCents: 56500, category: "E&M" },
    { cptCode: "99213", description: "Established patient visit, 20-29 min", defaultChargeCents: 15500, category: "E&M" },
    { cptCode: "99214", description: "Established patient visit, 30-39 min", defaultChargeCents: 22500, category: "E&M" },
    { cptCode: "99215", description: "Established patient visit, 40-54 min", defaultChargeCents: 32500, category: "E&M" },
    { cptCode: "99406", description: "Tobacco cessation counseling, 3-10 min", defaultChargeCents: 2500, category: "Counseling" },
    { cptCode: "99407", description: "Tobacco cessation counseling, >10 min", defaultChargeCents: 4500, category: "Counseling" },
    { cptCode: "G0447", description: "Behavioral counseling for obesity, 15 min", defaultChargeCents: 3500, category: "Counseling" },
    { cptCode: "96160", description: "Health risk assessment, patient-focused", defaultChargeCents: 1500, category: "Assessment" },
    { cptCode: "99401", description: "Preventive counseling, 15 min", defaultChargeCents: 5500, category: "Counseling" },
    { cptCode: "99402", description: "Preventive counseling, 30 min", defaultChargeCents: 10500, category: "Counseling" },
  ];

  for (const entry of feeScheduleEntries) {
    await prisma.feeScheduleEntry.upsert({
      where: {
        organizationId_cptCode: {
          organizationId: org.id,
          cptCode: entry.cptCode,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        ...entry,
      },
    });
  }

  // Idempotency: cleanIdempotent() at the top of main() wipes all of
  // the billing tables (payments, financial events, claims, statements,
  // payment plans, coverage, stored payment methods) so we can safely
  // recreate them with .create() on every deploy.

  // Upcoming appointments for today + this week (demo schedule)
  const appointmentSeeds = [
    // Today
    { patientId: maya.id, hoursFromNow: -2, durationMin: 30, modality: "in_person", status: AppointmentStatus.completed },
    { patientId: james.id, hoursFromNow: 1, durationMin: 45, modality: "video", status: AppointmentStatus.confirmed },
    { patientId: sarah.id, hoursFromNow: 3, durationMin: 30, modality: "in_person", status: AppointmentStatus.confirmed },
    // Tomorrow
    { patientId: maya.id, hoursFromNow: 26, durationMin: 30, modality: "video", status: AppointmentStatus.confirmed },
    { patientId: james.id, hoursFromNow: 28, durationMin: 30, modality: "in_person", status: AppointmentStatus.confirmed },
    // Day after
    { patientId: sarah.id, hoursFromNow: 50, durationMin: 45, modality: "in_person", status: AppointmentStatus.confirmed },
    { patientId: maya.id, hoursFromNow: 52, durationMin: 30, modality: "phone", status: AppointmentStatus.requested },
    // Next week
    { patientId: james.id, hoursFromNow: 170, durationMin: 30, modality: "video", status: AppointmentStatus.confirmed },
    { patientId: maya.id, hoursFromNow: 172, durationMin: 30, modality: "in_person", status: AppointmentStatus.confirmed },
  ];

  for (const appt of appointmentSeeds) {
    const start = new Date(Date.now() + appt.hoursFromNow * 60 * 60 * 1000);
    const end = new Date(start.getTime() + appt.durationMin * 60 * 1000);
    await prisma.appointment.create({
      data: {
        patientId: appt.patientId,
        providerId: provider.id,
        status: appt.status,
        startAt: start,
        endAt: end,
        modality: appt.modality,
      },
    });
  }

  // Claims — full lifecycle representation
  const claimSeeds = [
    // Paid claim (Maya, 30 days ago)
    {
      patient: maya,
      encounter: mayaCompletedEncounter,
      status: ClaimStatus.paid,
      cptCodes: [{ code: "99214", label: "Established patient, 30-39 min", units: 1, chargeAmount: 22500 }],
      icd10: [{ code: "G89.29", label: "Other chronic pain" }, { code: "F41.1", label: "Generalized anxiety disorder" }],
      billedAmount: 22500,
      allowedAmount: 18000,
      paidAmount: 14400,
      patientResp: 3600,
      payerName: "Blue Cross Blue Shield",
      serviceDaysAgo: 30,
      paidDaysAgo: 12,
    },
    // Pending claim (Maya, 10 days ago)
    {
      patient: maya,
      encounter: null as any,
      status: ClaimStatus.accepted,
      cptCodes: [{ code: "99213", label: "Established patient, 20-29 min", units: 1, chargeAmount: 15500 }],
      icd10: [{ code: "G47.00", label: "Insomnia, unspecified" }],
      billedAmount: 15500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Blue Cross Blue Shield",
      serviceDaysAgo: 10,
      paidDaysAgo: null,
    },
    // Partially paid with patient balance
    {
      patient: james,
      encounter: null as any,
      status: ClaimStatus.partial,
      cptCodes: [{ code: "99204", label: "New patient visit, 45-59 min", units: 1, chargeAmount: 42500 }],
      icd10: [{ code: "F41.1", label: "Generalized anxiety disorder" }, { code: "F32.9", label: "Major depressive disorder" }],
      billedAmount: 42500,
      allowedAmount: 32000,
      paidAmount: 25600,
      patientResp: 6400,
      payerName: "Aetna",
      serviceDaysAgo: 20,
      paidDaysAgo: 5,
    },
    // Denied claim (needs action)
    {
      patient: sarah,
      encounter: null as any,
      status: ClaimStatus.denied,
      cptCodes: [{ code: "99215", label: "Established patient, 40-54 min", units: 1, chargeAmount: 32500 }],
      icd10: [{ code: "M54.5", label: "Low back pain" }],
      billedAmount: 32500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "UnitedHealthcare",
      serviceDaysAgo: 15,
      paidDaysAgo: null,
      denialReason: "Missing prior authorization for extended visit",
    },
    // Submitted, awaiting response
    {
      patient: james,
      encounter: null as any,
      status: ClaimStatus.submitted,
      cptCodes: [{ code: "99213", label: "Established patient, 20-29 min", units: 1, chargeAmount: 15500 }],
      icd10: [{ code: "F41.1", label: "Generalized anxiety disorder" }],
      billedAmount: 15500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Aetna",
      serviceDaysAgo: 3,
      paidDaysAgo: null,
    },
    // Draft (ready to bill — note exists but claim not submitted)
    {
      patient: maya,
      encounter: null as any,
      status: ClaimStatus.draft,
      cptCodes: [{ code: "99214", label: "Established patient, 30-39 min", units: 1, chargeAmount: 22500 }],
      icd10: [{ code: "G89.29", label: "Other chronic pain" }],
      billedAmount: 22500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Blue Cross Blue Shield",
      serviceDaysAgo: 1,
      paidDaysAgo: null,
    },
    // Draft with deliberate scrub issues (no diagnosis, high-level E&M)
    {
      patient: james,
      encounter: null as any,
      status: ClaimStatus.draft,
      cptCodes: [{ code: "99215", label: "Established patient, 40-54 min", units: 1, chargeAmount: 32500 }],
      icd10: [], // missing diagnosis — scrub will flag
      billedAmount: 32500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Aetna",
      serviceDaysAgo: 2,
      paidDaysAgo: null,
    },
    // Draft with stale service date (timely filing risk)
    {
      patient: sarah,
      encounter: null as any,
      status: ClaimStatus.draft,
      cptCodes: [{ code: "99213", label: "Established patient, 20-29 min", units: 1, chargeAmount: 15500 }],
      icd10: [{ code: "G47.00", label: "Insomnia" }],
      billedAmount: 15500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "UnitedHealthcare",
      serviceDaysAgo: 95, // past 90-day mark
      paidDaysAgo: null,
    },
    // Aged 91-120 days denied (medical necessity)
    {
      patient: maya,
      encounter: null as any,
      status: ClaimStatus.denied,
      cptCodes: [{ code: "99215", label: "Established patient, 40-54 min", units: 1, chargeAmount: 32500 }],
      icd10: [{ code: "F41.1", label: "Generalized anxiety disorder" }],
      billedAmount: 32500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Blue Cross Blue Shield",
      serviceDaysAgo: 105,
      paidDaysAgo: null,
      denialReason: "Service deemed not medically necessary based on plan policy. Records required for appeal.",
    },
    // Aged 120+ days denied (timely filing)
    {
      patient: james,
      encounter: null as any,
      status: ClaimStatus.denied,
      cptCodes: [{ code: "99213", label: "Established patient, 20-29 min", units: 1, chargeAmount: 15500 }],
      icd10: [{ code: "F32.9", label: "Major depressive disorder" }],
      billedAmount: 15500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Aetna",
      serviceDaysAgo: 135,
      paidDaysAgo: null,
      denialReason: "Claim received past timely filing limit of 90 days.",
    },
    // Aged 61-90 days pending (insurance taking forever)
    {
      patient: sarah,
      encounter: null as any,
      status: ClaimStatus.accepted,
      cptCodes: [{ code: "99214", label: "Established patient, 30-39 min", units: 1, chargeAmount: 22500 }],
      icd10: [{ code: "M54.5", label: "Low back pain" }],
      billedAmount: 22500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "UnitedHealthcare",
      serviceDaysAgo: 75,
      paidDaysAgo: null,
    },
    // Denied — modifier issue
    {
      patient: maya,
      encounter: null as any,
      status: ClaimStatus.denied,
      cptCodes: [{ code: "99213", label: "Established patient, 20-29 min", units: 1, chargeAmount: 15500 }],
      icd10: [{ code: "G89.29", label: "Other chronic pain" }],
      billedAmount: 15500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Blue Cross Blue Shield",
      serviceDaysAgo: 25,
      paidDaysAgo: null,
      denialReason: "Modifier 25 required for separate E&M on same day as procedure.",
    },
    // Denied — bundling
    {
      patient: james,
      encounter: null as any,
      status: ClaimStatus.denied,
      cptCodes: [{ code: "99214", label: "Established patient, 30-39 min", units: 1, chargeAmount: 22500 }],
      icd10: [{ code: "F41.1", label: "Generalized anxiety disorder" }],
      billedAmount: 22500,
      allowedAmount: null,
      paidAmount: 0,
      patientResp: 0,
      payerName: "Aetna",
      serviceDaysAgo: 18,
      paidDaysAgo: null,
      denialReason: "Service is bundled into another service performed on the same date per NCCI edits.",
    },
  ];

  for (const claimData of claimSeeds) {
    const serviceDate = new Date(Date.now() - claimData.serviceDaysAgo * 24 * 60 * 60 * 1000);
    const claim = await prisma.claim.create({
      data: {
        organizationId: org.id,
        patientId: claimData.patient.id,
        encounterId: claimData.encounter?.id ?? null,
        providerId: provider.id,
        status: claimData.status,
        cptCodes: claimData.cptCodes,
        icd10Codes: claimData.icd10,
        billedAmountCents: claimData.billedAmount,
        allowedAmountCents: claimData.allowedAmount,
        paidAmountCents: claimData.paidAmount,
        patientRespCents: claimData.patientResp,
        payerName: claimData.payerName,
        claimNumber: `CLM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        serviceDate,
        submittedAt: claimData.status !== ClaimStatus.draft ? new Date(serviceDate.getTime() + 24 * 60 * 60 * 1000) : null,
        paidAt: claimData.paidDaysAgo != null ? new Date(Date.now() - claimData.paidDaysAgo * 24 * 60 * 60 * 1000) : null,
        deniedAt: claimData.status === ClaimStatus.denied ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null,
        denialReason: claimData.denialReason ?? null,
      },
    });

    // Create payment records for paid/partial claims
    if (claimData.paidAmount > 0) {
      await prisma.payment.create({
        data: {
          claimId: claim.id,
          source: PaymentSource.insurance,
          amountCents: claimData.paidAmount,
          paymentDate: new Date(Date.now() - (claimData.paidDaysAgo ?? 10) * 24 * 60 * 60 * 1000),
          reference: `EFT${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        },
      });
    }
  }

  console.log("  Practice management: fee schedule + appointments + claims seeded.");

  // ------------------------------------------------------------------
  // Insurance coverage for each patient
  // ------------------------------------------------------------------

  await prisma.patientCoverage.create({
    data: {
      patientId: maya.id,
      type: CoverageType.primary,
      payerName: "Blue Cross Blue Shield",
      payerId: "BCBS-CA",
      memberId: "XJA749382105",
      groupNumber: "GRP-492",
      planName: "BlueShield PPO Gold",
      subscriberName: "Maya Reyes",
      relationshipToSubscriber: "self",
      effectiveDate: new Date("2026-01-01"),
      eligibilityStatus: EligibilityStatus.active,
      eligibilityLastCheckedAt: daysAgo(5),
      copayCents: 2500,
      deductibleCents: 150000,
      deductibleMetCents: 87000,
      outOfPocketMaxCents: 600000,
      outOfPocketMetCents: 142000,
      coinsurancePct: 20,
    },
  });

  await prisma.patientCoverage.create({
    data: {
      patientId: james.id,
      type: CoverageType.primary,
      payerName: "Aetna",
      payerId: "AETNA-COMM",
      memberId: "W293847561",
      groupNumber: "AET-118",
      planName: "Aetna Open Access Silver",
      subscriberName: "James Chen",
      relationshipToSubscriber: "self",
      effectiveDate: new Date("2026-01-01"),
      eligibilityStatus: EligibilityStatus.active,
      eligibilityLastCheckedAt: daysAgo(12),
      copayCents: 4000,
      deductibleCents: 300000,
      deductibleMetCents: 45000,
      outOfPocketMaxCents: 800000,
      outOfPocketMetCents: 76000,
      coinsurancePct: 30,
    },
  });

  await prisma.patientCoverage.create({
    data: {
      patientId: sarah.id,
      type: CoverageType.primary,
      payerName: "UnitedHealthcare",
      payerId: "UHC-CHOICE",
      memberId: "UHC78291045",
      planName: "UHC Choice Plus",
      subscriberName: "Sarah Thompson",
      relationshipToSubscriber: "self",
      effectiveDate: new Date("2026-01-01"),
      eligibilityStatus: EligibilityStatus.active,
      eligibilityLastCheckedAt: daysAgo(20),
      copayCents: 3500,
      deductibleCents: 250000,
      deductibleMetCents: 250000,
      outOfPocketMaxCents: 700000,
      outOfPocketMetCents: 310000,
      coinsurancePct: 20,
    },
  });

  // ------------------------------------------------------------------
  // Financial ledger events — generate from existing claims
  // ------------------------------------------------------------------
  const allClaims = await prisma.claim.findMany({
    where: { organizationId: org.id },
    include: { payments: true },
  });

  for (const claim of allClaims) {
    // 1. Charge created
    await prisma.financialEvent.create({
      data: {
        organizationId: org.id,
        patientId: claim.patientId,
        claimId: claim.id,
        encounterId: claim.encounterId,
        type: FinancialEventType.charge_created,
        amountCents: claim.billedAmountCents,
        description: `Charge created: ${(claim.cptCodes as any[])[0]?.code ?? "service"}`,
        occurredAt: claim.serviceDate,
      },
    });

    // 2. Claim submitted (if not draft)
    if (claim.submittedAt) {
      await prisma.financialEvent.create({
        data: {
          organizationId: org.id,
          patientId: claim.patientId,
          claimId: claim.id,
          type: FinancialEventType.claim_submitted,
          amountCents: 0,
          description: `Claim submitted to ${claim.payerName ?? "payer"}`,
          occurredAt: claim.submittedAt,
          metadata: { payer: claim.payerName, claimNumber: claim.claimNumber },
        },
      });
    }

    // 3. Insurance payments
    for (const payment of claim.payments) {
      if (payment.source === PaymentSource.insurance) {
        await prisma.financialEvent.create({
          data: {
            organizationId: org.id,
            patientId: claim.patientId,
            claimId: claim.id,
            paymentId: payment.id,
            type: FinancialEventType.insurance_paid,
            amountCents: payment.amountCents,
            description: `${claim.payerName} paid ${formatCents(payment.amountCents)}`,
            occurredAt: payment.paymentDate,
            metadata: { reference: payment.reference },
          },
        });
      }
    }

    // 4. Contractual adjustment
    if (claim.allowedAmountCents != null && claim.allowedAmountCents < claim.billedAmountCents) {
      const adjustment = claim.billedAmountCents - claim.allowedAmountCents;
      await prisma.financialEvent.create({
        data: {
          organizationId: org.id,
          patientId: claim.patientId,
          claimId: claim.id,
          type: FinancialEventType.contractual_adjustment,
          amountCents: -adjustment,
          description: `Contractual adjustment: ${formatCents(adjustment)}`,
          occurredAt: claim.paidAt ?? claim.submittedAt ?? claim.serviceDate,
        },
      });
    }

    // 5. Patient responsibility transfer
    if (claim.patientRespCents > 0) {
      await prisma.financialEvent.create({
        data: {
          organizationId: org.id,
          patientId: claim.patientId,
          claimId: claim.id,
          type: FinancialEventType.patient_responsibility_transferred,
          amountCents: claim.patientRespCents,
          description: `Patient responsibility: ${formatCents(claim.patientRespCents)}`,
          occurredAt: claim.paidAt ?? claim.submittedAt ?? claim.serviceDate,
        },
      });
    }

    // 6. Denial
    if (claim.status === ClaimStatus.denied && claim.deniedAt) {
      await prisma.financialEvent.create({
        data: {
          organizationId: org.id,
          patientId: claim.patientId,
          claimId: claim.id,
          type: FinancialEventType.claim_denied,
          amountCents: 0,
          description: `Claim denied: ${claim.denialReason ?? "reason not specified"}`,
          occurredAt: claim.deniedAt,
          metadata: { denialReason: claim.denialReason },
        },
      });
    }
  }

  // Copay collected at check-in for Maya (historical)
  await prisma.financialEvent.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      type: FinancialEventType.copay_assessed,
      amountCents: 2500,
      description: "Copay assessed at check-in",
      occurredAt: daysAgo(30),
    },
  });
  await prisma.financialEvent.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      type: FinancialEventType.copay_collected,
      amountCents: 2500,
      description: "Copay collected (card, Visa •4242)",
      occurredAt: daysAgo(30),
      metadata: { method: "card", last4: "4242", brand: "Visa" },
    },
  });

  // ------------------------------------------------------------------
  // Statements — one per patient who has outstanding balance
  // ------------------------------------------------------------------

  // Maya: $36.00 patient resp from paid claim
  await prisma.statement.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      statementNumber: "STMT-2026-001",
      periodStart: daysAgo(30),
      periodEnd: daysAgo(1),
      dueDate: new Date(Date.now() + 20 * DAY_MS),
      totalChargesCents: 22500,
      insurancePaidCents: 14400,
      adjustmentsCents: 4500,
      priorBalanceCents: 0,
      amountDueCents: 3600,
      paidToDateCents: 0,
      status: StatementStatus.sent,
      deliveryMethod: "portal",
      sentAt: daysAgo(10),
      viewedAt: daysAgo(8),
      lineItems: [
        {
          description: "Office visit (99214)",
          amountCents: 22500,
          date: daysAgo(30).toISOString(),
          cptCode: "99214",
          insurancePaid: 14400,
          adjustment: 4500,
          patientResponsibility: 3600,
        },
      ],
      plainLanguageSummary:
        "This is for your visit with Dr. Okafor on " +
        daysAgo(30).toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
        ". Your insurance (Blue Cross Blue Shield) paid most of it — $144.00. The remaining $36.00 is your portion, which is your copay and a small coinsurance amount. You can pay online or set up a payment plan.",
    },
  });

  // James: $64.00 patient resp from partial paid claim
  await prisma.statement.create({
    data: {
      organizationId: org.id,
      patientId: james.id,
      statementNumber: "STMT-2026-002",
      periodStart: daysAgo(20),
      periodEnd: daysAgo(1),
      dueDate: new Date(Date.now() + 15 * DAY_MS),
      totalChargesCents: 42500,
      insurancePaidCents: 25600,
      adjustmentsCents: 10500,
      priorBalanceCents: 0,
      amountDueCents: 6400,
      paidToDateCents: 0,
      status: StatementStatus.sent,
      deliveryMethod: "portal",
      sentAt: daysAgo(5),
      lineItems: [
        {
          description: "New patient visit (99204)",
          amountCents: 42500,
          date: daysAgo(20).toISOString(),
          cptCode: "99204",
          insurancePaid: 25600,
          adjustment: 10500,
          patientResponsibility: 6400,
        },
      ],
      plainLanguageSummary:
        "This is for your first visit on " +
        daysAgo(20).toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
        ". Aetna covered most of it. Your share is $64.00, which goes toward your deductible. Paying this brings you closer to meeting your annual deductible.",
    },
  });

  // Maya: payment plan example
  await prisma.paymentPlan.create({
    data: {
      organizationId: org.id,
      patientId: maya.id,
      totalAmountCents: 3600,
      installmentAmountCents: 1200,
      frequency: "monthly",
      numberOfInstallments: 3,
      installmentsPaid: 0,
      startDate: new Date(),
      nextPaymentDate: new Date(Date.now() + 20 * DAY_MS),
      status: PaymentPlanStatus.active,
      autopayEnabled: false,
    },
  });

  // Stored payment method for Maya
  await prisma.storedPaymentMethod.create({
    data: {
      patientId: maya.id,
      type: "card",
      last4: "4242",
      brand: "Visa",
      expiryMonth: 11,
      expiryYear: 2029,
      isDefault: true,
      tokenReference: "tok_demo_" + Math.random().toString(36).slice(2, 12),
      consentedAt: daysAgo(30),
    },
  });

  console.log("  Billing: coverage + ledger + statements + payment plans seeded.");

  // ------------------------------------------------------------------
  // Agentic memory harness — seed longitudinal memory + observations
  // ------------------------------------------------------------------
  // This is what makes the Memory tab actually show something the
  // moment you open a patient chart in demo. Real production memories
  // are written by the agents themselves (correspondenceNurse,
  // preVisitIntelligence, etc.) over the course of care; the seed data
  // is just a believable starting point for the demo.
  //
  // Every entry is narrative prose, not structured fields. Read them
  // aloud and they should sound like a clinician's private note about
  // the patient, not a database row.
  //
  // Idempotent: deleteMany first so reseeding doesn't pile up.

  await prisma.patientMemory.deleteMany({
    where: { patientId: { in: [maya.id, james.id, sarah.id] } },
  });
  await prisma.clinicalObservation.deleteMany({
    where: { patientId: { in: [maya.id, james.id, sarah.id] } },
  });

  // ─── Maya Reyes — rich longitudinal memory ────────────────────
  await prisma.patientMemory.createMany({
    data: [
      {
        patientId: maya.id,
        kind: "working",
        content:
          "The THC:CBD 1:1 tincture with CBN at bedtime is clearly helping. Pain has trended from 7/10 at intake to a consistent 3-4/10 over the last three weeks, and she's reporting her first nights of real sleep in years.",
        confidence: 0.9,
        tags: ["pain", "sleep", "tincture", "CBN"],
        source: "correspondenceNurse",
        sourceKind: "agent",
        createdAt: daysAgo(14),
      },
      {
        patientId: maya.id,
        kind: "not_working",
        content:
          "Early morning grogginess from the CBN bedtime component was a problem in week one. Solved by moving the dose to 60-90 minutes before bed. Do not need to re-titrate the CBN.",
        confidence: 0.85,
        tags: ["CBN", "side-effect", "timing"],
        source: "correspondenceNurse",
        sourceKind: "agent",
        createdAt: daysAgo(10),
      },
      {
        patientId: maya.id,
        kind: "preference",
        content:
          "Prefers direct, specific responses over general reassurance. Asks concrete questions (timing, mg, interactions) and wants concrete answers back. Don't over-soften.",
        confidence: 0.8,
        tags: ["communication"],
        source: "correspondenceNurse",
        sourceKind: "agent",
        createdAt: daysAgo(12),
      },
      {
        patientId: maya.id,
        kind: "relationship",
        content:
          "Her adult daughter is a primary support — Maya mentions their walks together as a goal metric. When she improves, she wants to be able to walk 3 miles with her daughter.",
        confidence: 0.9,
        tags: ["support", "daughter", "goal"],
        source: "correspondenceNurse",
        sourceKind: "agent",
        createdAt: daysAgo(8),
      },
      {
        patientId: maya.id,
        kind: "trajectory",
        content:
          "Pain scores: 7 → 5 → 4 → 3 over the last 30 days. Sleep scores: 4 → 5 → 6 → 7. Anxiety stable around 3-4. The cannabis regimen is performing exactly as hoped; reinforce and hold.",
        confidence: 0.92,
        tags: ["pain", "sleep", "anxiety", "trend"],
        source: "preVisitIntelligence",
        sourceKind: "agent",
        createdAt: daysAgo(2),
      },
      {
        patientId: maya.id,
        kind: "milestone",
        content:
          "3/15/26 — first pain-free day since starting cannabis therapy. Walked 3 miles with her daughter. She messaged the clinic the same day; the note made Dr. Okafor's week.",
        confidence: 0.95,
        tags: ["milestone", "pain-free"],
        source: "correspondenceNurse",
        sourceKind: "agent",
        createdAt: daysAgo(5),
      },
      {
        patientId: maya.id,
        kind: "context",
        content:
          "Prior to starting here, Maya tried gabapentin (caused fog) and tramadol (made her anxious). Cannabis is the third attempt. She's open about the fact that she doesn't want to be 'stuck on pills forever' — the minimum-effective-dose framing resonates with her.",
        confidence: 0.85,
        tags: ["history", "gabapentin", "tramadol"],
        source: "intake",
        sourceKind: "agent",
        createdAt: daysAgo(30),
      },
      {
        patientId: maya.id,
        kind: "observation",
        content:
          "Adherence has been 92% over the last 30 days (measured by DoseLog entries against the regimen frequency). That's remarkably high for a patient this early in therapy. Whatever Dr. Okafor is doing with the onboarding, it's working.",
        confidence: 0.9,
        tags: ["adherence"],
        source: "preVisitIntelligence",
        sourceKind: "agent",
        createdAt: daysAgo(2),
      },
    ],
  });

  // ─── James Chen — newer patient, earlier memory ───────────────
  await prisma.patientMemory.createMany({
    data: [
      {
        patientId: james.id,
        kind: "concern",
        content:
          "James reported chest pressure while walking uphill on 4/8. The correspondence nurse triaged this as an emergency and routed him to the ER. Cardiology follow-up pending. Do not start any new cannabis dosing until cardiac workup is complete.",
        confidence: 0.98,
        tags: ["cardiac", "emergency", "hold"],
        source: "correspondenceNurse",
        sourceKind: "agent",
        createdAt: daysAgo(4),
      },
      {
        patientId: james.id,
        kind: "preference",
        content:
          "Prefers phone over messaging for anything clinical. Responds to texts but wants the real conversation by voice. His wife helps him manage his health — include her in care planning when he opts in.",
        confidence: 0.75,
        tags: ["communication", "wife"],
        source: "intake",
        sourceKind: "agent",
        createdAt: daysAgo(21),
      },
      {
        patientId: james.id,
        kind: "context",
        content:
          "Retired electrician, 47. Primary concern is sleep and anxiety related to a workplace accident three years ago. Has tried SSRIs (did not tolerate) and trazodone (worked but sedation was too heavy the next morning).",
        confidence: 0.88,
        tags: ["history", "sleep", "anxiety", "SSRI"],
        source: "intake",
        sourceKind: "agent",
        createdAt: daysAgo(21),
      },
      {
        patientId: james.id,
        kind: "trajectory",
        content:
          "Anxiety scores trending slightly downward (5 → 4 → 4 over two weeks), but sleep remains poor (3-4/10 most nights). The cannabis regimen hasn't been running long enough to evaluate — we're still in the titration window.",
        confidence: 0.7,
        tags: ["anxiety", "sleep", "titration"],
        source: "preVisitIntelligence",
        sourceKind: "agent",
        createdAt: daysAgo(3),
      },
    ],
  });

  // ─── Sarah Thompson — thin memory (newest patient) ────────────
  await prisma.patientMemory.createMany({
    data: [
      {
        patientId: sarah.id,
        kind: "context",
        content:
          "Brand new to the practice — intake submitted last week. Presenting concerns focus on chronic migraine. Has not started any cannabis therapy yet; we're still in assessment.",
        confidence: 0.85,
        tags: ["new", "migraine"],
        source: "intake",
        sourceKind: "agent",
        createdAt: daysAgo(7),
      },
      {
        patientId: sarah.id,
        kind: "preference",
        content:
          "Says in her intake answers that she wants 'the science, not the vibes.' Lead with the research corpus and mechanism when explaining recommendations; she'll push back on anything that sounds hand-wavy.",
        confidence: 0.8,
        tags: ["communication", "evidence"],
        source: "intake",
        sourceKind: "agent",
        createdAt: daysAgo(7),
      },
    ],
  });

  // ─── Clinical observations (visible in the Memory tab feed) ───
  await prisma.clinicalObservation.createMany({
    data: [
      {
        patientId: maya.id,
        observedBy: "correspondenceNurse",
        observedByKind: "agent",
        category: "positive_signal",
        severity: "info",
        summary:
          "Maya reported her first pain-free day since starting cannabis therapy. Positive update — reinforce and encourage.",
        evidence: { messageIds: [] } as any,
        createdAt: daysAgo(5),
      },
      {
        patientId: maya.id,
        observedBy: "preVisitIntelligence",
        observedByKind: "agent",
        category: "symptom_trend",
        severity: "notable",
        summary:
          "Pain and sleep scores are both improving steadily on the current regimen. 92% adherence. Considering a possible dose reduction at the next visit to test durability.",
        evidence: {} as any,
        actionSuggested:
          "At the next visit, discuss whether to hold or gently taper the bedtime CBN component.",
        createdAt: daysAgo(2),
      },
      {
        patientId: james.id,
        observedBy: "correspondenceNurse",
        observedByKind: "agent",
        category: "red_flag",
        severity: "urgent",
        summary:
          "Emergency keywords detected in James's message: 'chest pain', 'trouble breathing'. Routed to ER. Cardiac evaluation pending. Cannabis therapy on hold.",
        evidence: {} as any,
        actionSuggested:
          "Follow up on cardiology workup before resuming or advancing any cannabis dosing.",
        createdAt: daysAgo(4),
      },
      {
        patientId: james.id,
        observedBy: "preVisitIntelligence",
        observedByKind: "agent",
        category: "adherence",
        severity: "notable",
        summary:
          "James has not logged a single dose in 4 days, coinciding with the ER visit. Expected — we told him to hold. Will need to re-verify readiness before restarting.",
        evidence: {} as any,
        createdAt: daysAgo(1),
      },
      {
        patientId: sarah.id,
        observedBy: "intake",
        observedByKind: "agent",
        category: "engagement",
        severity: "info",
        summary:
          "Sarah completed her intake in one sitting and asked multiple follow-up questions about mechanism of action. High engagement — she's ready for a detailed first visit.",
        evidence: {} as any,
        createdAt: daysAgo(6),
      },
    ],
  });

  console.log("  Memory harness: patient memories + observations seeded.");

  // ------------------------------------------------------------------
  // RCM Fleet — billing demo data for Revenue Cockpit + Clinical Billing
  // ------------------------------------------------------------------
  // Seed realistic claims with charges, denials, and adjustments so the
  // billing surfaces actually show data on first load.

  // Clean up prior billing demo data (idempotent)
  await prisma.adjustment.deleteMany({ where: { claim: { organizationId: org.id } } });
  await prisma.denialEvent.deleteMany({ where: { claim: { organizationId: org.id } } });
  await prisma.charge.deleteMany({ where: { organizationId: org.id } });

  // Maya's completed encounter → Claim 1 (paid in full, clean path)
  const mayaClaim1 = await prisma.claim.upsert({
    where: { id: "demo-claim-maya-1" },
    update: {},
    create: {
      id: "demo-claim-maya-1",
      organizationId: org.id,
      patientId: maya.id,
      encounterId: mayaCompletedEncounter.id,
      providerId: provider.id,
      status: "paid",
      claimNumber: "CLM-20260405-0001",
      cptCodes: [
        { code: "99214", label: "Office visit, established, moderate MDM", units: 1, chargeAmount: 18500, modifiers: ["25"] },
        { code: "36415", label: "Venipuncture", units: 1, chargeAmount: 3600, modifiers: [] },
      ] as any,
      icd10Codes: [
        { code: "G89.29", label: "Other chronic pain", sequence: 1 },
        { code: "Z71.3", label: "Cannabis counseling", sequence: 2 },
      ] as any,
      billedAmountCents: 22100,
      allowedAmountCents: 19200,
      paidAmountCents: 19200,
      patientRespCents: 2500,
      payerName: "Aetna",
      payerId: "AETNA-001",
      billingNpi: "1234567890",
      renderingNpi: "1234567890",
      placeOfService: "11",
      frequencyCode: "1",
      serviceDate: daysAgo(7),
      submittedAt: daysAgo(6),
      paidAt: daysAgo(1),
      closedAt: daysAgo(1),
      closureType: "paid_in_full",
      humanTouches: 0,
    },
  });

  // Maya Claim 1 charges
  await prisma.charge.createMany({
    data: [
      {
        encounterId: mayaCompletedEncounter.id,
        patientId: maya.id,
        organizationId: org.id,
        cptCode: "99214",
        cptDescription: "Office visit, established patient, moderate MDM",
        modifiers: ["25"],
        units: 1,
        icd10Codes: ["G89.29", "Z71.3"],
        feeAmountCents: 18500,
        status: "claim_attached",
        claimId: mayaClaim1.id,
        confidence: 0.94,
        createdBy: "encounterIntelligence:1.0.0",
      },
      {
        encounterId: mayaCompletedEncounter.id,
        patientId: maya.id,
        organizationId: org.id,
        cptCode: "36415",
        cptDescription: "Venipuncture",
        modifiers: [],
        units: 1,
        icd10Codes: ["Z71.3"],
        feeAmountCents: 3600,
        status: "claim_attached",
        claimId: mayaClaim1.id,
        confidence: 0.98,
        createdBy: "encounterIntelligence:1.0.0",
      },
    ],
  });

  // Contractual adjustment on Maya's paid claim
  await prisma.adjustment.create({
    data: {
      claimId: mayaClaim1.id,
      type: "contractual",
      amountCents: 2900,
      reason: "Contractual adjustment per Aetna agreement",
      carcCode: "45",
      postedAt: daysAgo(1),
    },
  });

  // James — Claim 2 (denied for medical necessity, appeal pending)
  const jamesClaim = await prisma.claim.upsert({
    where: { id: "demo-claim-james-1" },
    update: {},
    create: {
      id: "demo-claim-james-1",
      organizationId: org.id,
      patientId: james.id,
      providerId: provider.id,
      status: "denied",
      claimNumber: "CLM-20260408-0002",
      cptCodes: [
        { code: "99213", label: "Office visit, established, low MDM", units: 1, chargeAmount: 12800, modifiers: [] },
      ] as any,
      icd10Codes: [
        { code: "F41.1", label: "Generalized anxiety disorder", sequence: 1 },
        { code: "G47.00", label: "Insomnia", sequence: 2 },
      ] as any,
      billedAmountCents: 12800,
      allowedAmountCents: 0,
      paidAmountCents: 0,
      patientRespCents: 0,
      payerName: "UnitedHealthcare",
      payerId: "UHC-001",
      placeOfService: "11",
      frequencyCode: "1",
      serviceDate: daysAgo(14),
      submittedAt: daysAgo(13),
      deniedAt: daysAgo(5),
      denialReason: "Service not medically necessary per plan guidelines",
      humanTouches: 0,
    },
  });

  // Denial event for James
  await prisma.denialEvent.create({
    data: {
      claimId: jamesClaim.id,
      carcCode: "50",
      rarcCode: "N386",
      groupCode: "CO",
      denialCategory: "medical_necessity",
      amountDeniedCents: 12800,
      recoverable: true,
      recoverableAmountCents: 12800,
      resolution: "pending",
    },
  });

  // Maya — Claim 3 (submitted, pending adjudication)
  await prisma.claim.upsert({
    where: { id: "demo-claim-maya-2" },
    update: {},
    create: {
      id: "demo-claim-maya-2",
      organizationId: org.id,
      patientId: maya.id,
      providerId: provider.id,
      status: "submitted",
      claimNumber: "CLM-20260410-0003",
      cptCodes: [
        { code: "99214", label: "Office visit, established, moderate MDM", units: 1, chargeAmount: 18500, modifiers: [] },
      ] as any,
      icd10Codes: [
        { code: "G89.29", label: "Other chronic pain", sequence: 1 },
      ] as any,
      billedAmountCents: 18500,
      paidAmountCents: 0,
      patientRespCents: 0,
      payerName: "Aetna",
      payerId: "AETNA-001",
      placeOfService: "02",
      frequencyCode: "1",
      serviceDate: daysAgo(2),
      submittedAt: daysAgo(1),
      humanTouches: 0,
    },
  });

  console.log("  RCM Fleet: billing demo data seeded (3 claims, charges, denials).");

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log("Seed complete.");
  console.log("  Owner:     owner@demo.health            / password123");
  console.log("  Clinician: clinician@demo.health        / password123");
  console.log("  Patient 1: patient@demo.health (Maya)   / password123");
  console.log("  Patient 2: james.chen@demo.health       / password123");
  console.log("  Patient 3: sarah.thompson@demo.health   / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
