import {
  type FundLedgerEntry,
  type DistributionProposal,
  appendEntry,
} from "./charitable-fund";

/**
 * Build a stable, hash-chained demo ledger. Adding/removing entries here
 * is the canonical way to evolve the public-facing /advocacy/fund page
 * until persistence lands. Order matters — the chain hashes prev → next.
 */
export function buildDemoFundLedger(): FundLedgerEntry[] {
  const day = 24 * 60 * 60 * 1000;
  const t = (offsetDays: number) => new Date(Date.UTC(2026, 0, 1) + offsetDays * day).toISOString();

  let chain: FundLedgerEntry[] = [];
  const append = (e: Parameters<typeof appendEntry>[1]) => {
    chain = appendEntry(chain, e);
  };

  append({
    occurredAt: t(0),
    direction: "inflow",
    amountCents: 25_000_00,
    source: "founders_pledge",
    memo: "Co-founders' opening pledge — Article VII",
  });
  append({
    occurredAt: t(8),
    direction: "inflow",
    amountCents: 4_120_00,
    source: "revenue_share",
    memo: "January platform revenue share (2.5%)",
  });
  append({
    occurredAt: t(15),
    direction: "outflow",
    amountCents: 5_000_00,
    destinationCharityId: "char-mpp",
    destinationCharityName: "Marijuana Policy Project",
    memo: "Q1 distribution — state legalization advocacy",
  });
  append({
    occurredAt: t(22),
    direction: "inflow",
    amountCents: 1_840_00,
    source: "volunteer_offset",
    memo: "Q1 patient volunteer offsets — 92 patients",
  });
  append({
    occurredAt: t(30),
    direction: "inflow",
    amountCents: 525_00,
    source: "voluntary_donation",
    memo: "Member donations (anonymized aggregate)",
  });
  append({
    occurredAt: t(45),
    direction: "outflow",
    amountCents: 3_000_00,
    destinationCharityId: "char-veterans",
    destinationCharityName: "Veterans Cannabis Coalition",
    memo: "Veterans peer-support program — Q1",
  });
  append({
    occurredAt: t(60),
    direction: "inflow",
    amountCents: 5_000_00,
    source: "matching_grant",
    memo: "Anonymous donor 1:1 match (capped at $5,000)",
  });
  append({
    occurredAt: t(75),
    direction: "outflow",
    amountCents: 2_500_00,
    destinationCharityId: "char-foodbank",
    destinationCharityName: "Bay Area Food Bank",
    memo: "Q1 distribution — Tampa Bay region",
  });
  append({
    occurredAt: t(90),
    direction: "inflow",
    amountCents: 4_780_00,
    source: "revenue_share",
    memo: "February platform revenue share (2.5%)",
  });
  append({
    occurredAt: t(105),
    direction: "outflow",
    amountCents: 4_000_00,
    destinationCharityId: "char-research",
    destinationCharityName: "Cannabis Research Foundation",
    memo: "Patient outcomes research grant",
  });
  append({
    occurredAt: t(118),
    direction: "inflow",
    amountCents: 5_220_00,
    source: "revenue_share",
    memo: "March platform revenue share (2.5%)",
  });
  return chain;
}

export function buildDemoProposals(): DistributionProposal[] {
  return [
    {
      id: "prop-1",
      proposedAt: "2026-04-12T00:00:00Z",
      proposerName: "Dr. Patel",
      charityId: "char-harm",
      charityName: "Drug Policy Alliance",
      amountCents: 4_000_00,
      rationale: "Q2 community education funding for harm-reduction outreach in 5 states.",
      vetted: true,
      conflictOfInterest: false,
      patientAdvisoryReview: "approved",
      clinicalAdvisoryReview: "approved",
    },
    {
      id: "prop-2",
      proposedAt: "2026-04-18T00:00:00Z",
      proposerName: "Scott Wayman",
      charityId: "char-youth",
      charityName: "Youth Tutoring Collective",
      amountCents: 2_500_00,
      rationale: "Match patient volunteer hours logged for math tutoring in Q1.",
      vetted: true,
      conflictOfInterest: false,
      patientAdvisoryReview: "approved",
      clinicalAdvisoryReview: "pending",
    },
    {
      id: "prop-3",
      proposedAt: "2026-04-22T00:00:00Z",
      proposerName: "Dr. Patel",
      charityId: "char-conflict",
      charityName: "Independent Wellness Co-op",
      amountCents: 6_000_00,
      rationale: "Pilot grant — flagged: founder Dr. Patel sits on the recipient's advisory board.",
      vetted: true,
      conflictOfInterest: true,
      patientAdvisoryReview: "pending",
      clinicalAdvisoryReview: "pending",
    },
  ];
}
