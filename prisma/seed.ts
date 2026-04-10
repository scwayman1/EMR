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
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const now = Date.now();

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

  // Maya — Message thread (3 messages back and forth)
  const mayaThread = await prisma.messageThread.create({
    data: {
      patientId: maya.id,
      subject: "Welcome to Green Path Health",
      lastMessageAt: daysAgo(2),
    },
  });

  await prisma.message.create({
    data: {
      threadId: mayaThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.read,
      body: "Hi Maya! Welcome to Green Path Health. I'm Dr. Okafor and I'll be your care provider. Feel free to reach out any time with questions about your treatment plan or cannabis therapy in general.",
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
      body: "Thank you Dr. Okafor! I had a quick question — for the tincture you recommended, should I take it sublingually or can I add it to tea? Also, is it okay to take it with my evening ibuprofen?",
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
      body: "Great questions! Sublingual is preferred — hold it under your tongue for 60-90 seconds before swallowing for the fastest absorption. Adding it to tea works too but onset will be slower (45-60 min vs 15-20 min). Taking it alongside ibuprofen is fine; no known interactions at this dosage. Let me know how your first week goes!",
      aiDrafted: false,
      sentAt: daysAgo(2),
      createdAt: daysAgo(2),
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

  // James — Message thread (1 welcome message)
  const jamesThread = await prisma.messageThread.create({
    data: {
      patientId: james.id,
      subject: "Welcome to Green Path Health",
      lastMessageAt: daysAgo(1),
    },
  });

  await prisma.message.create({
    data: {
      threadId: jamesThread.id,
      senderUserId: clinicianUser.id,
      status: MessageStatus.sent,
      body: "Hi James, welcome to Green Path Health! I'm Dr. Okafor. I've reviewed your intake information and I'm looking forward to our upcoming consultation. In the meantime, please continue logging your sleep and anxiety levels daily so we have good baseline data to work with.",
      aiDrafted: false,
      sentAt: daysAgo(1),
      createdAt: daysAgo(1),
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
