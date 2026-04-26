// ---------------------------------------------------------------------------
// Money / percentage / day formatters used across the CFO surface.
// Kept in its own file (no Prisma deps) so server *and* client components
// can import it.
// ---------------------------------------------------------------------------

export function fmtMoney(cents: number, opts?: { compact?: boolean; sign?: boolean }): string {
  const compact = opts?.compact ?? false;
  const abs = Math.abs(cents);
  if (compact && abs >= 1_000_000_00) {
    return `${cents < 0 ? "−" : opts?.sign ? "+" : ""}$${(abs / 100_000_000).toFixed(1)}M`;
  }
  if (compact && abs >= 100_000_00) {
    return `${cents < 0 ? "−" : opts?.sign ? "+" : ""}$${Math.round(abs / 100_000)}K`;
  }
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 0 : 2,
  });
  const out = formatter.format(abs / 100);
  if (cents < 0) return `−${out}`;
  if (opts?.sign && cents > 0) return `+${out}`;
  return out;
}

export function fmtPct(value: number, opts?: { sign?: boolean; decimals?: number }): string {
  const dec = opts?.decimals ?? 1;
  const fixed = value.toFixed(dec);
  if (opts?.sign && value > 0) return `+${fixed}%`;
  return `${fixed}%`;
}

export function fmtDays(days: number): string {
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  if (days >= 30) return `${(days / 30).toFixed(1)}mo`;
  return `${days}d`;
}

export function fmtRatio(r: number): string {
  return r.toFixed(2);
}

export function changeBadgeText(changePct: number | null | undefined, biggerIsBetter = true): { text: string; tone: "good" | "bad" | "neutral" } {
  if (changePct === null || changePct === undefined) return { text: "—", tone: "neutral" };
  if (Math.abs(changePct) < 0.05) return { text: "0%", tone: "neutral" };
  const text = `${changePct > 0 ? "+" : ""}${changePct}%`;
  const isUp = changePct > 0;
  const tone: "good" | "bad" | "neutral" = isUp === biggerIsBetter ? "good" : "bad";
  return { text, tone };
}
