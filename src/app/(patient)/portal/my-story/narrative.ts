// Template-based narrative generation — no LLM calls.
// Warm, second-person prose. Clinically accurate without clinical coldness.

// ---------------------------------------------------------------------------
// Trend narrative
// ---------------------------------------------------------------------------

interface TrendEntry {
  metric: string;
  values: number[];
}

function metricLabel(metric: string): string {
  const labels: Record<string, string> = {
    pain: "pain level",
    sleep: "sleep quality",
    anxiety: "anxiety",
    mood: "mood",
    nausea: "nausea",
    appetite: "appetite",
    energy: "energy level",
    adherence: "treatment adherence",
    side_effects: "side-effect burden",
  };
  return labels[metric] ?? metric.replace(/_/g, " ");
}

/** True when higher values are "better" (sleep, mood, appetite, energy, adherence). */
function higherIsBetter(metric: string): boolean {
  return ["sleep", "mood", "appetite", "energy", "adherence"].includes(metric);
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function trendWord(first: number, last: number, higherGood: boolean): string {
  const diff = last - first;
  const absDiff = Math.abs(diff);
  if (absDiff < 0.5) return "stayed relatively steady";
  const direction = diff > 0 ? "trending upward" : "trending downward";
  const quality =
    (diff > 0 && higherGood) || (diff < 0 && !higherGood)
      ? "which is encouraging"
      : "something to keep an eye on";
  return `been ${direction}, ${quality}`;
}

export function buildTrendNarrative(data: TrendEntry[]): string {
  if (!data.length) {
    return "There isn't enough outcome data to describe trends yet. As you log more check-ins, a picture of your progress will emerge here.";
  }

  const sentences: string[] = [];
  const withData = data.filter((d) => d.values.length >= 2);

  if (!withData.length) {
    return "You've started logging outcomes, but there aren't enough data points to show trends just yet. Keep it up -- even a quick daily check-in makes a difference.";
  }

  for (const entry of withData) {
    const vals = entry.values;
    const recentHalf = vals.slice(Math.max(0, vals.length - Math.ceil(vals.length / 2)));
    const olderHalf = vals.slice(0, Math.ceil(vals.length / 2));
    const recentAvg = average(recentHalf);
    const olderAvg = average(olderHalf);
    const label = metricLabel(entry.metric);
    const hib = higherIsBetter(entry.metric);
    const trend = trendWord(olderAvg, recentAvg, hib);
    const latest = vals[vals.length - 1];

    sentences.push(
      `Your ${label} has ${trend}, moving from an average of ${olderAvg.toFixed(1)} to ${recentAvg.toFixed(1)}. Your most recent reading was ${latest.toFixed(1)} out of 10.`
    );
  }

  // Metrics with only one data point
  const singlePoint = data.filter((d) => d.values.length === 1);
  for (const entry of singlePoint) {
    sentences.push(
      `You've recorded one ${metricLabel(entry.metric)} check-in so far, at ${entry.values[0].toFixed(1)} out of 10.`
    );
  }

  return sentences.join(" ");
}

// ---------------------------------------------------------------------------
// Cannabis history narrative
// ---------------------------------------------------------------------------

interface CannabisHistory {
  priorUse: boolean;
  formats?: string[];
  reportedBenefits?: string[];
  reportedSideEffects?: string[];
}

export function buildCannabisNarrative(history: CannabisHistory | null): string {
  if (!history || !history.priorUse) {
    return "You haven't shared any prior cannabis experience yet. If you've used cannabis before -- or if this is entirely new territory -- that context helps your care team tailor their guidance. You can update this in your intake form any time.";
  }

  const parts: string[] = [];

  // Formats
  if (history.formats && history.formats.length > 0) {
    const formatted = formatList(history.formats);
    parts.push(
      `You've shared that you have experience with cannabis, primarily using ${formatted}.`
    );
  } else {
    parts.push("You've shared that you have prior experience with cannabis.");
  }

  // Benefits
  if (history.reportedBenefits && history.reportedBenefits.length > 0) {
    const formatted = formatList(history.reportedBenefits);
    parts.push(`You've reported that it has helped with ${formatted}.`);
  }

  // Side effects
  if (history.reportedSideEffects && history.reportedSideEffects.length > 0) {
    const formatted = formatList(history.reportedSideEffects);
    parts.push(
      `You've noticed ${formatted} as ${history.reportedSideEffects.length === 1 ? "a side effect" : "side effects"}.`
    );
  } else {
    parts.push("You haven't reported any notable side effects so far.");
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Treatment goals narrative
// ---------------------------------------------------------------------------

export function buildGoalsNarrative(goals: string | null): string {
  if (!goals || !goals.trim()) {
    return "You haven't set specific treatment goals yet. When you're ready, sharing what you'd like to achieve helps your care team craft a plan that truly fits your life.";
  }

  const trimmed = goals.trim();
  // If goals already read as a paragraph (starts with uppercase, ends with punctuation), keep them largely intact.
  const endsWithPunctuation = /[.!?]$/.test(trimmed);
  const looksLikeProse = trimmed.length > 40 && endsWithPunctuation;

  if (looksLikeProse) {
    return `Your treatment goals, in your own words: "${trimmed}" These goals guide every recommendation your care team makes.`;
  }

  return `Your treatment goals center on ${lowercaseFirst(trimmed)}${endsWithPunctuation ? "" : "."} These goals guide every recommendation your care team makes.`;
}

// ---------------------------------------------------------------------------
// Presenting concerns narrative
// ---------------------------------------------------------------------------

export function buildConcernsNarrative(concerns: string | null): string {
  if (!concerns || !concerns.trim()) {
    return "Your presenting concerns haven't been documented yet. Sharing what brought you to care helps your team understand the full picture.";
  }

  const trimmed = concerns.trim();
  const endsWithPunctuation = /[.!?]$/.test(trimmed);
  const looksLikeProse = trimmed.length > 40 && endsWithPunctuation;

  if (looksLikeProse) {
    return `You came to Leafjourney because: "${trimmed}"`;
  }

  return `You came to Leafjourney seeking help with ${lowercaseFirst(trimmed)}${endsWithPunctuation ? "" : "."}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0].toLowerCase();
  if (items.length === 2)
    return `${items[0].toLowerCase()} and ${items[1].toLowerCase()}`;
  const head = items.slice(0, -1).map((i) => i.toLowerCase());
  const tail = items[items.length - 1].toLowerCase();
  return `${head.join(", ")}, and ${tail}`;
}

function lowercaseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
