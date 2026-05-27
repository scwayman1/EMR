import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import {
  AGE_BAND_DESCRIPTION,
  AGE_BAND_LABELS,
  type AgeBand,
} from "@/lib/utils/patient-age";

/**
 * EMR-083: Pediatric chart overlay.
 *
 * A read-only summary cluster surfaced on the clinician chart for any
 * patient whose age band resolves to infant / child / adolescent. The
 * cluster covers the four areas a pediatric encounter consistently needs:
 * growth tracking, immunization status, parental/guardian consent, and
 * school accommodations.
 *
 * Each tile is a placeholder UI scaffold — wiring real data sources
 * (growth-chart server action, vaccine schedule from CDC seed, school
 * accommodations from intake forms) is tracked in the EMR-083 follow-up
 * tickets. The overlay structure here is the contract those data-source
 * tickets fill in.
 */

export type PediatricModuleProps = {
  patientId: string;
  patientFirstName?: string | null;
  band: AgeBand;
  age: number | null;
  /** Optional preview values — wire these to real data when available. */
  preview?: {
    heightPercentile?: number;
    weightPercentile?: number;
    bmiPercentile?: number;
    immunizationsUpToDate?: boolean;
    guardianOnFile?: boolean;
    iep504OnFile?: boolean;
  };
};

export function PediatricModule({
  patientId,
  patientFirstName,
  band,
  age,
  preview,
}: PediatricModuleProps) {
  const greeting = patientFirstName
    ? `${patientFirstName}'s pediatric overlay`
    : "Pediatric overlay";

  return (
    <Card tone="ambient" className="rounded-3xl overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Eyebrow className="mb-2">{AGE_BAND_LABELS[band]} chart</Eyebrow>
            <CardTitle className="font-display text-xl">{greeting}</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed mt-1.5 max-w-2xl">
              {AGE_BAND_DESCRIPTION[band]}
            </p>
          </div>
          {age !== null && (
            <Badge tone="accent" className="shrink-0">
              {age} {age === 1 ? "year" : "years"} old
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GrowthTile preview={preview} />
          <ImmunizationsTile preview={preview} patientId={patientId} />
          <GuardianConsentTile preview={preview} patientId={patientId} />
          <SchoolAccommodationsTile preview={preview} patientId={patientId} />
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({
  title,
  href,
  badge,
  description,
  children,
}: {
  title: string;
  href?: string;
  badge?: { tone: "success" | "warning" | "accent" | "neutral"; label: string };
  description: string;
  children?: React.ReactNode;
}) {
  const inner = (
    <div className="h-full rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-muted/60">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-display text-base text-text tracking-tight">
          {title}
        </h4>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function GrowthTile({ preview }: { preview?: PediatricModuleProps["preview"] }) {
  const h = preview?.heightPercentile;
  const w = preview?.weightPercentile;
  const bmi = preview?.bmiPercentile;
  return (
    <Tile
      title="Growth & development"
      description="Height, weight, BMI tracked against CDC growth curves. Tap to log a new measurement or view the velocity chart."
    >
      <div className="grid grid-cols-3 gap-2">
        <Percentile label="Height" value={h} />
        <Percentile label="Weight" value={w} />
        <Percentile label="BMI" value={bmi} />
      </div>
    </Tile>
  );
}

function Percentile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-surface-muted/60 border border-border/70 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <p className="font-display text-lg text-text mt-0.5 tabular-nums">
        {value !== undefined ? `${value}%` : "—"}
      </p>
    </div>
  );
}

function ImmunizationsTile({
  preview,
  patientId: _patientId,
}: {
  preview?: PediatricModuleProps["preview"];
  patientId: string;
}) {
  const ok = preview?.immunizationsUpToDate;
  return (
    <Tile
      title="Immunizations"
      description="CDC age-appropriate schedule. Pull from the state registry and reconcile any gaps before the visit."
      badge={
        ok === undefined
          ? { tone: "neutral", label: "Unknown" }
          : ok
            ? { tone: "success", label: "Up to date" }
            : { tone: "warning", label: "Catch-up needed" }
      }
    />
  );
}

function GuardianConsentTile({
  preview,
  patientId: _patientId,
}: {
  preview?: PediatricModuleProps["preview"];
  patientId: string;
}) {
  const ok = preview?.guardianOnFile;
  return (
    <Tile
      title="Parent / guardian consent"
      description="Verified guardian relationship and signed consent for treatment. Required for any non-emergency care for minors."
      badge={
        ok === undefined
          ? { tone: "neutral", label: "Not verified" }
          : ok
            ? { tone: "success", label: "On file" }
            : { tone: "warning", label: "Missing" }
      }
    />
  );
}

function SchoolAccommodationsTile({
  preview,
  patientId: _patientId,
}: {
  preview?: PediatricModuleProps["preview"];
  patientId: string;
}) {
  const ok = preview?.iep504OnFile;
  return (
    <Tile
      title="School & accommodations"
      description="IEP / 504 plans, school nurse contact, attendance impact. Helpful context for chronic conditions that touch the school day."
      badge={
        ok === undefined
          ? { tone: "neutral", label: "None on file" }
          : ok
            ? { tone: "accent", label: "Plan on file" }
            : { tone: "neutral", label: "None on file" }
      }
    />
  );
}
