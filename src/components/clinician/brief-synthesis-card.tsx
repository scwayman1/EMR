import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type {
  BriefTone,
  MorningBriefSynthesis,
} from "@/lib/agents/morning-brief-synthesizer";

// ---------------------------------------------------------------------------
// BriefSynthesisCard
// ---------------------------------------------------------------------------
// iOS-aesthetic "chief of staff" card that sits at the top of the clinician
// Morning Brief. Soft surface, hairline accent bar on the left, numeric
// highlights, tidy risk rail.
//
// Tones (from `synthesizeMorningBrief`):
//   ok       — green accent. "On track."
//   watch    — amber accent. Enough noise that the clinician should glance.
//   critical — red accent. At least one emergency-flagged thread.
// ---------------------------------------------------------------------------

const TONE_META: Record<
  BriefTone,
  { accent: string; chip: string; label: string }
> = {
  ok: {
    accent: "border-l-emerald-500",
    chip: "bg-emerald-50 text-emerald-700",
    label: "On track",
  },
  watch: {
    accent: "border-l-amber-500",
    chip: "bg-amber-50 text-amber-800",
    label: "Watch",
  },
  critical: {
    accent: "border-l-red-500",
    chip: "bg-red-50 text-red-700",
    label: "Critical",
  },
};

interface BriefSynthesisCardProps {
  synthesis: MorningBriefSynthesis;
  /** Shown as a small caption ("AI synthesis · 7:03 AM"). */
  generatedAt?: Date;
}

export function BriefSynthesisCard({
  synthesis,
  generatedAt,
}: BriefSynthesisCardProps) {
  const meta = TONE_META[synthesis.tone];
  const timeStr = generatedAt
    ? generatedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Card
      tone="raised"
      className={cn(
        "border-l-4 px-5 py-5 mb-6 rounded-2xl",
        meta.accent
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
              meta.chip
            )}
          >
            {meta.label}
          </span>
          <span className="text-[11px] text-text-subtle">
            AI synthesis{timeStr ? ` · ${timeStr}` : ""}
          </span>
        </div>
      </div>

      <p className="text-[15px] text-text leading-relaxed mb-4">
        {synthesis.summary}
      </p>

      {synthesis.highlights.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-1.5">
            Highlights
          </p>
          <ul className="space-y-1">
            {synthesis.highlights.map((h, i) => (
              <li
                key={i}
                className="text-sm text-text-muted leading-snug pl-3 relative"
              >
                <span
                  className="absolute left-0 top-2 w-1 h-1 rounded-full bg-text-subtle"
                  aria-hidden="true"
                />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {synthesis.risks.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-red-700/80 mb-1.5">
            Risks
          </p>
          <ul className="space-y-1">
            {synthesis.risks.map((r, i) => (
              <li
                key={i}
                className="text-sm text-text leading-snug pl-3 relative"
              >
                <span
                  className={cn(
                    "absolute left-0 top-2 w-1 h-1 rounded-full",
                    synthesis.tone === "critical"
                      ? "bg-red-500"
                      : "bg-amber-500"
                  )}
                  aria-hidden="true"
                />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/**
 * Fallback card shown when synthesis can't be produced (model offline,
 * missing credentials, etc.). Keeps the page intact and tells the clinician
 * what they're looking at instead of rendering a stub.
 */
export function BriefSynthesisUnavailableCard() {
  return (
    <Card
      tone="outlined"
      className="px-5 py-4 mb-6 rounded-2xl border-l-4 border-l-border"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase bg-stone-100 text-stone-600">
          Offline
        </span>
        <span className="text-[11px] text-text-subtle">AI synthesis</span>
      </div>
      <p className="text-sm text-text-muted leading-relaxed">
        Synthesis unavailable right now. The raw brief below is unaffected.
      </p>
    </Card>
  );
}
