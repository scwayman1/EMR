// Productivity Analytics — per-provider performance metrics
// Operationalizes the data already captured by the agent harness and encounter system.

export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  period: string;
  patientsSeenCount: number;
  encountersCount: number;
  notesFinalized: number;
  avgTimeToFinalizeMinutes: number;
  prescriptionsIssued: number;
  messagesResponded: number;
  avgResponseTimeMinutes: number;
  agentDraftsAccepted: number;
  agentDraftsRejected: number;
  agentAcceptanceRate: number;
  revenueGeneratedCents: number;
}

export interface PracticeMetrics {
  period: string;
  totalPatients: number;
  newPatients: number;
  totalEncounters: number;
  completionRate: number;
  noShowRate: number;
  avgWaitTimeMinutes: number;
  totalRevenueCents: number;
  outstandingBalanceCents: number;
  topReferralSources: { source: string; count: number }[];
  agentJobsRun: number;
  agentSuccessRate: number;
}

// ── Demo data ──────────────────────────────────────────

export function generateProviderMetrics(providers: { id: string; name: string }[]): ProviderMetrics[] {
  return providers.map((p, i) => ({
    providerId: p.id,
    providerName: p.name,
    period: "Last 30 days",
    patientsSeenCount: 45 + i * 12,
    encountersCount: 52 + i * 15,
    notesFinalized: 48 + i * 13,
    avgTimeToFinalizeMinutes: 8 - i * 1.5,
    prescriptionsIssued: 38 + i * 10,
    messagesResponded: 120 + i * 30,
    avgResponseTimeMinutes: 25 - i * 5,
    agentDraftsAccepted: 95 + i * 10,
    agentDraftsRejected: 5 + i,
    agentAcceptanceRate: 95 - i * 2,
    revenueGeneratedCents: 1250000 + i * 350000,
  }));
}

export function generatePracticeMetrics(): PracticeMetrics {
  return {
    period: "Last 30 days",
    totalPatients: 342,
    newPatients: 47,
    totalEncounters: 289,
    completionRate: 94,
    noShowRate: 6,
    avgWaitTimeMinutes: 12,
    totalRevenueCents: 4850000,
    outstandingBalanceCents: 325000,
    topReferralSources: [
      { source: "Google Search", count: 18 },
      { source: "Patient referral", count: 12 },
      { source: "Primary care", count: 8 },
      { source: "Social media", count: 5 },
      { source: "Insurance directory", count: 4 },
    ],
    agentJobsRun: 1247,
    agentSuccessRate: 97.2,
  };
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
