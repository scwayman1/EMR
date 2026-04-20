import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import {
  DOSING_PROTOCOLS,
  cannabinoidProfile,
  filterProtocols,
  protocolId,
  uniqueCannabinoids,
  uniqueConditions,
  type CannabinoidProfile,
  type DosingProtocol,
} from "@/lib/domain/cannabis-dosing-protocols";
import { ProtocolFilterBar } from "./protocol-filter-bar";

export const metadata = { title: "Dosing Protocols" };

interface PageProps {
  searchParams: { condition?: string; cannabinoid?: string };
}

export default function ProtocolsPage({ searchParams }: PageProps) {
  const allConditions = uniqueConditions();
  const allCannabinoids = uniqueCannabinoids();

  const activeCondition = searchParams.condition ?? "";
  const activeCannabinoid = searchParams.cannabinoid ?? "";

  const protocols = filterProtocols(DOSING_PROTOCOLS, {
    condition: activeCondition || undefined,
    cannabinoid: activeCannabinoid || undefined,
  });

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Library · Dosing"
        title="Cannabis dosing protocols"
        description="Evidence-based titration templates by condition and route. Start low, go slow — every protocol includes max daily dose guardrails, warnings, and monitoring schedule."
        actions={
          <Link href="/clinic/library">
            <Button variant="secondary" size="sm">
              &larr; Library
            </Button>
          </Link>
        }
      />

      <ProtocolFilterBar
        conditions={allConditions}
        cannabinoids={allCannabinoids}
        activeCondition={activeCondition}
        activeCannabinoid={activeCannabinoid}
        resultCount={protocols.length}
        totalCount={DOSING_PROTOCOLS.length}
      />

      <EditorialRule className="my-6" />

      {protocols.length === 0 ? (
        <Card tone="outlined">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-text-muted">
              No protocols match those filters.
            </p>
            <Link
              href="/clinic/library/protocols"
              className="text-sm text-accent hover:underline mt-2 inline-block"
            >
              Clear filters
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {protocols.map((p) => (
            <ProtocolCard key={protocolId(p)} protocol={p} />
          ))}
        </div>
      )}

      <p className="text-xs text-text-subtle mt-8">
        Protocols are reference templates. Always individualise dosing to the
        patient and reassess at each visit.
      </p>
    </PageShell>
  );
}

/* ── Card ──────────────────────────────────────────────────────── */

function ProtocolCard({ protocol }: { protocol: DosingProtocol }) {
  const id = protocolId(protocol);
  const profile = cannabinoidProfile(protocol);
  const weeks = protocol.titrationSteps.length;

  return (
    <Link
      href={`/clinic/library/protocols/${id}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-xl"
    >
      <Card
        tone="raised"
        className="h-full transition-shadow group-hover:shadow-lg"
      >
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display text-base font-medium text-text tracking-tight">
                {protocol.condition}
              </h3>
              <p className="text-xs text-text-subtle uppercase tracking-wide mt-0.5">
                {protocol.route} · {protocol.experienceLevel}
              </p>
            </div>
            <CannabinoidBadge profile={profile} />
          </div>

          <dl className="grid grid-cols-3 gap-3 text-xs mb-3">
            <Metric
              label="Start"
              value={`THC ${protocol.startingDose.thcMg} / CBD ${protocol.startingDose.cbdMg}`}
              unit="mg"
            />
            <Metric
              label="Max/day"
              value={`THC ${protocol.maxDailyDose.thcMg} / CBD ${protocol.maxDailyDose.cbdMg}`}
              unit="mg"
            />
            <Metric label="Titration" value={String(weeks)} unit={`step${weeks === 1 ? "" : "s"}`} />
          </dl>

          {protocol.warnings.length > 0 && (
            <p className="text-xs text-text-muted line-clamp-2">
              <span className="font-medium text-text">Note:</span>{" "}
              {protocol.warnings[0]}
            </p>
          )}

          <div className="mt-3 flex items-center justify-end text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            View full schedule &rarr;
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
        {label}
      </dt>
      <dd className="text-text font-medium tabular-nums mt-0.5">
        {value}
        {unit && <span className="text-text-subtle font-normal ml-1">{unit}</span>}
      </dd>
    </div>
  );
}

function CannabinoidBadge({ profile }: { profile: CannabinoidProfile }) {
  const tone =
    profile === "THC" ? "warning" : profile === "CBD" ? "success" : "accent";
  return <Badge tone={tone}>{profile}</Badge>;
}
