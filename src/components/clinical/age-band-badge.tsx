import { cn } from "@/lib/utils/cn";
import {
  AGE_BAND_BADGE_CLASS,
  AGE_BAND_LABELS,
  type AgeBand,
} from "@/lib/utils/patient-age";

export type AgeBandBadgeProps = {
  band: AgeBand;
  age?: number | null;
  className?: string;
};

/** A tiny chart-header pill that surfaces the active age band so the
 *  clinician can see at a glance which overlays apply. */
export function AgeBandBadge({ band, age, className }: AgeBandBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        AGE_BAND_BADGE_CLASS[band],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {AGE_BAND_LABELS[band]}
      {age !== null && age !== undefined && band !== "unknown" && (
        <span className="opacity-70 normal-case font-medium tracking-normal">
          · {age}y
        </span>
      )}
    </span>
  );
}
