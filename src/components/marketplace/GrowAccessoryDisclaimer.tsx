// EMR-282 — Grow-accessory legal disclaimer.
//
// Shown on the PDP of any product flagged growAccessory=true (e.g. lights,
// tents, fans, fertilizer, trim shears). Conveys two things in order:
//   1. Per-state legality summary (from cultivation-legality.ts) when the
//      patient's state is on file. Generic "verify with your state" when not.
//   2. Hard "you are solely responsible" disclaimer covering both state and
//      federal jurisdictions. Required regardless of the per-state lookup.
//
// We intentionally never claim authority over the legality determination —
// the lookup is convenience, the disclaimer is the floor.

import {
  getCultivationRule,
  statusLabel,
  statusTone,
  type StateCultivationRule,
} from "@/lib/marketplace/cultivation-legality";

interface Props {
  /** Customer's 2-letter state code, or null/undefined if unknown. */
  state?: string | null;
  className?: string;
}

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-red-50 border-red-200 text-red-900",
  neutral: "bg-[var(--surface-muted)] border-[var(--border)] text-text",
};

function StateBanner({ rule }: { rule: StateCultivationRule }) {
  const tone = statusTone(rule.status);
  return (
    <div className={`rounded-2xl border p-5 ${TONE_CLASS[tone]}`} role="region" aria-label={`Cultivation legality in ${rule.stateName}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1 opacity-80">
        Cultivation in {rule.stateName}
      </p>
      <p className="text-[15px] font-semibold mb-1.5">{statusLabel(rule.status)}</p>
      <p className="text-[13.5px] leading-relaxed opacity-90">{rule.summary}</p>
      {rule.regulatorUrl && (
        <a
          href={rule.regulatorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[12.5px] font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Read the official guidance →
        </a>
      )}
    </div>
  );
}

function UnknownStateBanner() {
  return (
    <div className={`rounded-2xl border p-5 ${TONE_CLASS.neutral}`} role="region" aria-label="Cultivation legality">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1 opacity-80">
        Cultivation legality
      </p>
      <p className="text-[15px] font-semibold mb-1.5">Verify with your state</p>
      <p className="text-[13.5px] leading-relaxed opacity-90">
        We don&apos;t have your state on file, so we can&apos;t give a tailored summary.
        Cannabis cultivation laws vary widely by state, county, and municipality.
        Check your state&apos;s cannabis regulator before purchasing or planting.
      </p>
    </div>
  );
}

export function GrowAccessoryDisclaimer({ state, className }: Props) {
  const rule = getCultivationRule(state);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {rule ? <StateBanner rule={rule} /> : <UnknownStateBanner />}

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-2">
          Your responsibility
        </p>
        <p className="text-[13.5px] text-text leading-relaxed mb-2">
          Cannabis cultivation is regulated at the state and federal level, and
          legality changes — sometimes overnight. The information above is a
          convenience summary, not legal advice. You are solely responsible for
          confirming that growing cannabis is legal in your state, county, and
          municipality, and for staying within plant counts, locations, and any
          registration or licensing requirements that apply to you.
        </p>
        <p className="text-[13.5px] text-text leading-relaxed mb-2">
          Federal law continues to classify cannabis as a controlled substance.
          Purchasing grow accessories from this site does not authorize you to
          cultivate cannabis, and Leafjourney makes no representation that doing
          so is legal in your jurisdiction.
        </p>
        <p className="text-[13.5px] font-semibold text-text leading-relaxed">
          Leafjourney is not liable for any legal consequences arising from your
          cultivation activities. If you are uncertain, consult a licensed
          attorney in your state before growing.
        </p>
      </div>
    </div>
  );
}

export default GrowAccessoryDisclaimer;
