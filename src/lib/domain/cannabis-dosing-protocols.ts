// Cannabis Dosing Protocols — EMR-146
// Evidence-based titration templates by condition + route.
// Start low, go slow. Max dose guardrails.

export interface DosingProtocol {
  condition: string;
  route: string;
  experienceLevel: "naive" | "experienced";
  startingDose: { thcMg: number; cbdMg: number };
  titrationSteps: Array<{
    week: number;
    thcMg: number;
    cbdMg: number;
    frequency: string;
    notes: string;
  }>;
  maxDailyDose: { thcMg: number; cbdMg: number };
  warnings: string[];
  monitoringSchedule: string;
}

export const DOSING_PROTOCOLS: DosingProtocol[] = [
  // ── Chronic Pain (Sublingual) ─────────────────────
  {
    condition: "Chronic Pain",
    route: "sublingual",
    experienceLevel: "naive",
    startingDose: { thcMg: 1, cbdMg: 5 },
    titrationSteps: [
      { week: 1, thcMg: 1, cbdMg: 5, frequency: "Once at bedtime", notes: "Observe for sedation, dizziness. Log pain daily." },
      { week: 2, thcMg: 2, cbdMg: 5, frequency: "Once at bedtime", notes: "Increase THC if tolerated. Continue pain logging." },
      { week: 3, thcMg: 2.5, cbdMg: 10, frequency: "Twice daily (AM + PM)", notes: "Add morning dose if daytime pain persists." },
      { week: 4, thcMg: 5, cbdMg: 10, frequency: "Twice daily", notes: "Target maintenance. Assess pain score trend." },
      { week: 6, thcMg: 5, cbdMg: 15, frequency: "Twice daily", notes: "Increase CBD for anti-inflammatory effect if needed." },
      { week: 8, thcMg: 7.5, cbdMg: 15, frequency: "Twice daily + PRN", notes: "Add PRN dose for breakthrough pain if needed." },
    ],
    maxDailyDose: { thcMg: 30, cbdMg: 60 },
    warnings: ["Do not drive for 4-6 hours after THC dose", "Avoid alcohol", "Report any new or worsening symptoms immediately"],
    monitoringSchedule: "Follow-up at 2 weeks, 4 weeks, then monthly. Pain VAS at each visit.",
  },

  // ── Insomnia (Sublingual) ─────────────────────────
  {
    condition: "Insomnia",
    route: "sublingual",
    experienceLevel: "naive",
    startingDose: { thcMg: 1, cbdMg: 5 },
    titrationSteps: [
      { week: 1, thcMg: 1, cbdMg: 5, frequency: "Once, 1h before bed", notes: "Note sleep onset time and wake time." },
      { week: 2, thcMg: 2.5, cbdMg: 5, frequency: "Once, 1h before bed", notes: "Increase if still taking >30min to fall asleep." },
      { week: 3, thcMg: 2.5, cbdMg: 10, frequency: "Once, 1h before bed", notes: "CBD increase for relaxation. Add CBN 2.5mg if available." },
      { week: 4, thcMg: 5, cbdMg: 10, frequency: "Once, 1h before bed", notes: "Target maintenance dose for most patients." },
    ],
    maxDailyDose: { thcMg: 20, cbdMg: 40 },
    warnings: ["Morning grogginess common at higher doses — reduce if persistent", "Tolerance may develop — consider periodic breaks (2-3 days)"],
    monitoringSchedule: "Follow-up at 2 weeks. Sleep diary recommended.",
  },

  // ── Anxiety (Sublingual, CBD-dominant) ─────────────
  {
    condition: "Anxiety",
    route: "sublingual",
    experienceLevel: "naive",
    startingDose: { thcMg: 0, cbdMg: 10 },
    titrationSteps: [
      { week: 1, thcMg: 0, cbdMg: 10, frequency: "Once daily (morning)", notes: "CBD only. Observe for sedation or GI effects." },
      { week: 2, thcMg: 0, cbdMg: 20, frequency: "Once or twice daily", notes: "Increase CBD. Split into AM/PM if preferred." },
      { week: 3, thcMg: 0, cbdMg: 25, frequency: "Twice daily", notes: "Target range for most anxiety patients." },
      { week: 4, thcMg: 1, cbdMg: 25, frequency: "Twice daily", notes: "Optional: add micro-dose THC (1mg) for enhanced effect. MONITOR for worsened anxiety." },
    ],
    maxDailyDose: { thcMg: 5, cbdMg: 100 },
    warnings: ["THC can WORSEN anxiety — go extremely slow if adding", "CBD doses >50mg/day: monitor liver enzymes", "CBG 10-20mg may be a better THC alternative for anxiolysis"],
    monitoringSchedule: "GAD-7 at baseline and every 4 weeks. Follow-up at 2 weeks for initial titration.",
  },

  // ── Nausea/Chemotherapy (Inhaled + Oral) ───────────
  {
    condition: "Chemotherapy-Induced Nausea",
    route: "inhaled + oral",
    experienceLevel: "naive",
    startingDose: { thcMg: 2.5, cbdMg: 2.5 },
    titrationSteps: [
      { week: 1, thcMg: 2.5, cbdMg: 2.5, frequency: "Oral, 1h before chemo + PRN inhaled", notes: "Oral for baseline. Inhaled for acute breakthrough nausea." },
      { week: 2, thcMg: 5, cbdMg: 5, frequency: "Oral BID on chemo days + PRN inhaled", notes: "Increase if nausea not controlled. Inhaled PRN: 1-2 puffs." },
      { week: 3, thcMg: 5, cbdMg: 5, frequency: "Oral BID + PRN", notes: "Stable dose. Adjust based on chemo regimen changes." },
    ],
    maxDailyDose: { thcMg: 40, cbdMg: 40 },
    warnings: ["Coordinate with oncology team", "Cannabis does not replace standard antiemetics (ondansetron, dexamethasone)", "Monitor for CHS if using daily for extended periods"],
    monitoringSchedule: "Each chemo cycle. Nausea VAS and antiemetic use tracking.",
  },

  // ── PTSD (Sublingual) ─────────────────────────────
  {
    condition: "PTSD",
    route: "sublingual",
    experienceLevel: "naive",
    startingDose: { thcMg: 1, cbdMg: 10 },
    titrationSteps: [
      { week: 1, thcMg: 1, cbdMg: 10, frequency: "CBD AM, THC+CBD PM", notes: "CBD for daytime anxiety. Low THC at bedtime for nightmares." },
      { week: 2, thcMg: 2, cbdMg: 15, frequency: "CBD AM, THC+CBD PM", notes: "Increase if nightmares persist. Monitor for next-day grogginess." },
      { week: 3, thcMg: 2.5, cbdMg: 20, frequency: "CBD twice daily, THC+CBD PM", notes: "Add midday CBD if afternoon anxiety spikes." },
      { week: 4, thcMg: 5, cbdMg: 20, frequency: "CBD twice daily, THC+CBD PM", notes: "Maintenance. PCL-5 reassessment." },
    ],
    maxDailyDose: { thcMg: 15, cbdMg: 60 },
    warnings: ["THC can worsen hyperarousal in some PTSD patients — titrate carefully", "Coordinate with mental health provider", "Do not replace trauma-focused therapy"],
    monitoringSchedule: "PCL-5 at baseline and monthly. Follow-up at 2 weeks for initial assessment.",
  },

  // ── Epilepsy (Oral CBD) ───────────────────────────
  {
    condition: "Treatment-Resistant Epilepsy",
    route: "oral",
    experienceLevel: "naive",
    startingDose: { thcMg: 0, cbdMg: 2.5 },
    titrationSteps: [
      { week: 1, thcMg: 0, cbdMg: 2.5, frequency: "BID (2.5mg/kg/day)", notes: "Per Epidiolex protocol. Monitor seizure diary." },
      { week: 2, thcMg: 0, cbdMg: 5, frequency: "BID (5mg/kg/day)", notes: "Double dose if tolerated. Check LFTs if on valproate." },
      { week: 3, thcMg: 0, cbdMg: 10, frequency: "BID (10mg/kg/day)", notes: "Target maintenance dose for most patients." },
      { week: 4, thcMg: 0, cbdMg: 20, frequency: "BID (20mg/kg/day)", notes: "Maximum dose per Epidiolex label. Only if needed." },
    ],
    maxDailyDose: { thcMg: 0, cbdMg: 20 },
    warnings: ["Doses are mg/kg/day, not flat mg", "LFT monitoring mandatory (baseline, 1mo, 3mo, 6mo)", "Clobazam interaction — may need 50% dose reduction", "Somnolence and diarrhea most common AEs at higher doses"],
    monitoringSchedule: "Seizure diary daily. Neurology follow-up monthly during titration. LFTs per protocol.",
  },
];

// Lookup helpers
export function findProtocol(condition: string, route?: string): DosingProtocol | null {
  const q = condition.toLowerCase();
  return DOSING_PROTOCOLS.find((p) =>
    p.condition.toLowerCase().includes(q) &&
    (!route || p.route.toLowerCase().includes(route.toLowerCase()))
  ) ?? null;
}

export function getAllProtocols(): DosingProtocol[] {
  return [...DOSING_PROTOCOLS];
}

export function getProtocolsByCondition(condition: string): DosingProtocol[] {
  const q = condition.toLowerCase();
  return DOSING_PROTOCOLS.filter((p) => p.condition.toLowerCase().includes(q));
}
