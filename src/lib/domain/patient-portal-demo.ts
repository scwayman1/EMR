import type { PlantHealth } from "@/lib/domain/plant-health";

function daysFromNow(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return date;
}

function daysAgo(n: number): Date {
  return daysFromNow(-n);
}

export const LOCAL_DEMO_PLANT_HEALTH: PlantHealth = {
  score: 82,
  stage: "flowering",
  leafColor: "deep-green",
  hasFlowers: true,
  stemCount: 4,
  leafCount: 10,
  healthFactors: [
    {
      label: "Check-ins",
      status: "positive",
      detail: "You checked in three times this week.",
    },
    {
      label: "Sleep trend",
      status: "positive",
      detail: "Sleep quality is improving.",
    },
  ],
};

export function buildLocalDemoPortalPatient() {
  return {
    id: "local-demo-patient",
    firstName: "Maya",
    lastName: "Rivera",
    chartSummary: {
      completenessScore: 88,
    },
    outcomeLogs: [
      { metric: "pain", value: 5.2, loggedAt: daysAgo(12) },
      { metric: "pain", value: 4.8, loggedAt: daysAgo(9) },
      { metric: "pain", value: 4.1, loggedAt: daysAgo(6) },
      { metric: "pain", value: 3.7, loggedAt: daysAgo(3) },
      { metric: "pain", value: 3.2, loggedAt: daysAgo(1) },
      { metric: "sleep", value: 5.4, loggedAt: daysAgo(12) },
      { metric: "sleep", value: 5.8, loggedAt: daysAgo(9) },
      { metric: "sleep", value: 6.4, loggedAt: daysAgo(6) },
      { metric: "sleep", value: 7.1, loggedAt: daysAgo(3) },
      { metric: "sleep", value: 7.4, loggedAt: daysAgo(1) },
      { metric: "anxiety", value: 3.4, loggedAt: daysAgo(1) },
      { metric: "mood", value: 7.6, loggedAt: daysAgo(1) },
      { metric: "energy", value: 6.8, loggedAt: daysAgo(1) },
      { metric: "adherence", value: 8.2, loggedAt: daysAgo(1) },
    ],
    encounters: [
      {
        id: "local-demo-visit-next",
        status: "scheduled",
        scheduledFor: daysFromNow(3),
        modality: "video",
        completedAt: null,
        briefingContext: { patientConfirmedAt: daysAgo(1).toISOString() },
      },
      {
        id: "local-demo-visit-recent",
        status: "complete",
        scheduledFor: daysAgo(18),
        modality: "video",
        completedAt: daysAgo(18),
        briefingContext: null,
      },
    ],
    tasks: [
      {
        id: "local-demo-task-checkin",
        title: "Log a two-minute symptom check-in",
        dueAt: daysFromNow(1),
      },
      {
        id: "local-demo-task-intake",
        title: "Review your medication list before the visit",
        dueAt: daysFromNow(2),
      },
      {
        id: "local-demo-task-goal",
        title: "Choose one sleep goal for the week",
        dueAt: daysFromNow(4),
      },
    ],
    messageThreads: [
      {
        id: "local-demo-thread",
        lastMessageAt: daysAgo(1),
        messages: [{ body: "Your care team reviewed your last check-in." }],
      },
    ],
    dosingRegimens: [
      {
        id: "local-demo-regimen",
        active: true,
        calculatedThcMgPerDay: 2.5,
        calculatedCbdMgPerDay: 25,
        calculatedThcMgPerDose: 1.25,
        calculatedCbdMgPerDose: 12.5,
        frequencyPerDay: 2,
        product: { name: "Balanced evening tincture" },
      },
    ],
  };
}

