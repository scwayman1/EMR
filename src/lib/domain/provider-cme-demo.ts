import {
  type CmeCredit,
  type ResearchSession,
  buildCreditFromSession,
  attestCredit,
  submitCredit,
} from "./provider-cme";

function buildSession(
  i: number,
  providerId: string,
  daysAgo: number,
  topic: string,
  durationMin: number,
  refs: number,
  depth: number,
): ResearchSession {
  const end = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - durationMin * 60 * 1000);
  return {
    id: `rs-${providerId.slice(-3)}-${i}`,
    providerId,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    referencesViewed: refs,
    queryCount: Math.max(1, Math.round(depth * 10)),
    queryDepthScore: depth,
    topic,
  };
}

export function buildDemoCmeLedger(providerId: string): { sessions: ResearchSession[]; credits: CmeCredit[] } {
  const sessions: ResearchSession[] = [
    buildSession(1, providerId, 2, "Cannabis & chemotherapy-induced nausea", 45, 7, 0.8),
    buildSession(2, providerId, 5, "CBD/THC ratios in pediatric epilepsy", 60, 9, 0.9),
    buildSession(3, providerId, 9, "Opioid-sparing in chronic back pain", 30, 4, 0.5),
    buildSession(4, providerId, 14, "Endocannabinoid system in PTSD", 75, 12, 0.85),
    buildSession(5, providerId, 21, "Drug-drug interactions: warfarin + CBD", 22, 5, 0.7),
    buildSession(6, providerId, 28, "Cancer cachexia — appetite stimulation evidence", 8, 2, 0.4), // floor fail
    buildSession(7, providerId, 38, "Inflammatory bowel — cannabis evidence map", 50, 8, 0.7),
  ];

  const now = new Date();
  let credits = sessions.map((s) => buildCreditFromSession(s, now));

  // First two are submitted, next two earned, rest pending — looks like a real ledger.
  credits = credits.map((c, i) => {
    if (i < 2) return submitCredit(attestCredit(c), "AMA");
    if (i < 4) return attestCredit(c);
    return c;
  });

  return { sessions, credits };
}
