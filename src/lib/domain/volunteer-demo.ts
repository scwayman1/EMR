import type {
  VolunteerOpportunity,
  VolunteerHour,
} from "./volunteer";

export const DEMO_OPPORTUNITIES: VolunteerOpportunity[] = [
  {
    id: "opp-1",
    charityId: "char-mpp",
    charityName: "Marijuana Policy Project",
    category: "patient_advocacy",
    title: "State legalization phone bank",
    summary: "Help patients in non-medical states call lawmakers about pending bills.",
    kind: "remote",
    hoursEstimate: 2,
    recurringWeekly: true,
    vetted: true,
    vettedAt: "2026-04-12T00:00:00Z",
  },
  {
    id: "opp-2",
    charityId: "char-veterans",
    charityName: "Veterans Cannabis Coalition",
    category: "veteran",
    title: "Saturday morning peer-support meetup",
    summary: "Co-host a peer-support meetup for veterans exploring cannabis as adjunct therapy.",
    kind: "in_person",
    location: { city: "Tampa", state: "FL", lat: 27.9506, lon: -82.4572 },
    hoursEstimate: 3,
    recurringWeekly: true,
    vetted: true,
    vettedAt: "2026-04-10T00:00:00Z",
  },
  {
    id: "opp-3",
    charityId: "char-foodbank",
    charityName: "Bay Area Food Bank",
    category: "food_security",
    title: "Distribution-line volunteer",
    summary: "Pack and distribute weekly grocery boxes to families in need.",
    kind: "in_person",
    location: { city: "St. Petersburg", state: "FL", lat: 27.7676, lon: -82.6403 },
    hoursEstimate: 4,
    recurringWeekly: true,
    vetted: true,
    vettedAt: "2026-04-09T00:00:00Z",
  },
  {
    id: "opp-4",
    charityId: "char-harm",
    charityName: "Drug Policy Alliance",
    category: "harm_reduction",
    title: "Community education night",
    summary: "Lead a community education session on safe-use practices and harm reduction.",
    kind: "hybrid",
    location: { city: "Tampa", state: "FL", lat: 27.9506, lon: -82.4572 },
    hoursEstimate: 2,
    vetted: true,
    vettedAt: "2026-04-15T00:00:00Z",
  },
  {
    id: "opp-5",
    charityId: "char-research",
    charityName: "Cannabis Research Foundation",
    category: "research",
    title: "Patient-survey transcription",
    summary: "Transcribe and tag de-identified patient-experience survey audio for research.",
    kind: "remote",
    hoursEstimate: 5,
    vetted: true,
    vettedAt: "2026-04-04T00:00:00Z",
  },
  {
    id: "opp-6",
    charityId: "char-youth",
    charityName: "Youth Tutoring Collective",
    category: "youth_education",
    title: "Math tutor — middle school",
    summary: "Weekly tutoring session for under-resourced middle-school students.",
    kind: "in_person",
    location: { city: "Orlando", state: "FL", lat: 28.5383, lon: -81.3792 },
    hoursEstimate: 1.5,
    recurringWeekly: true,
    vetted: true,
    vettedAt: "2026-04-02T00:00:00Z",
  },
];

export function buildDemoHours(userId: string): VolunteerHour[] {
  // Always seed enough recent hours that the quarterly progress bar shows
  // motion. Mix verified + self-reported so the badge logic is exercised.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: `vh-${userId.slice(-3)}-1`,
      userId,
      opportunityId: "opp-2",
      hours: 3,
      occurredAt: new Date(now - 5 * day).toISOString(),
      status: "verified",
      verifierName: "Sarah Chen",
      verifierEmail: "sarah@vetscannabis.org",
    },
    {
      id: `vh-${userId.slice(-3)}-2`,
      userId,
      opportunityId: "opp-5",
      hours: 2,
      occurredAt: new Date(now - 12 * day).toISOString(),
      status: "self_reported",
    },
    {
      id: `vh-${userId.slice(-3)}-3`,
      userId,
      opportunityId: "opp-1",
      hours: 1.5,
      occurredAt: new Date(now - 21 * day).toISOString(),
      status: "verified",
      verifierName: "Devon Ramos",
    },
  ];
}

/** Default home anchor when a patient hasn't set one — Tampa, FL. */
export const DEFAULT_HOME = { lat: 27.9506, lon: -82.4572 };
