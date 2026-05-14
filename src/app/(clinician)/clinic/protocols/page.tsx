/**
 * EMR-092 — Dual treatment protocols catalogue
 *
 * Browse the Western + Eastern protocol pairs side-by-side. The
 * underlying `dual-protocols` lib carries the steps, goals, and
 * cross-arm interaction rules; this page is the catalogue browser
 * clinicians scan before activating a protocol on a patient chart.
 */

import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import {
  DUAL_PROTOCOLS,
  findInteractions,
  type DualProtocol,
  type ProtocolStep,
} from "@/lib/clinical/dual-protocols";

export const metadata = { title: "Dual treatment protocols" };

export default async function ProtocolsPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Dual treatment protocols"
        title="Western + Eastern, side by side"
        description="Every protocol pair carries a pharmacotherapy arm and a complementary cannabis / herbal / lifestyle arm. Interactions between the two arms are surfaced inline so you spot CYP overlap, additive sedation, and bleeding-risk pairings before activation."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DUAL_PROTOCOLS.map((p) => (
          <ProtocolCard key={p.id} protocol={p} />
        ))}
      </div>
    </PageShell>
  );
}

function ProtocolCard({ protocol }: { protocol: DualProtocol }) {
  const conflicts = findInteractions(protocol);

  return (
    <Card tone="raised">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{protocol.condition}</CardTitle>
          {protocol.consentGated.length > 0 && (
            <Badge tone="warning">Consent gated</Badge>
          )}
        </div>
        <CardDescription>{protocol.description}</CardDescription>
        {protocol.icd10.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {protocol.icd10.slice(0, 6).map((c) => (
              <Badge key={c} tone="neutral">{c}</Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ArmColumn title="Western" steps={protocol.westernSteps} />
          <ArmColumn title="Eastern" steps={protocol.easternSteps} />
        </div>

        <div className="mt-4 pt-4 border-t border-border/60">
          <Eyebrow className="mb-2">Goals</Eyebrow>
          <ul className="space-y-1">
            {protocol.goals.map((g) => (
              <li key={g} className="text-[13px] text-text-muted">
                • {g}
              </li>
            ))}
          </ul>
        </div>

        {conflicts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <Eyebrow className="mb-2">Cross-arm interactions</Eyebrow>
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="text-[12px] text-text-muted flex items-start gap-2"
                >
                  <Badge
                    tone={
                      c.severity === "danger"
                        ? "danger"
                        : c.severity === "caution"
                          ? "warning"
                          : "info"
                    }
                  >
                    {c.severity}
                  </Badge>
                  <span>
                    <span className="font-medium text-text">
                      {c.westernStep.label}
                    </span>{" "}
                    +{" "}
                    <span className="font-medium text-text">
                      {c.easternStep.label}
                    </span>
                    : {c.explanation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArmColumn({
  title,
  steps,
}: {
  title: string;
  steps: ProtocolStep[];
}) {
  return (
    <div>
      <Eyebrow className="mb-2">{title}</Eyebrow>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.id} className="text-[13px] text-text leading-snug">
            <div className="font-medium">{s.label}</div>
            <div className="text-text-subtle text-[11px]">
              Day {s.startDay}
              {s.durationDays ? `, ${s.durationDays}d` : ""}
              {s.cadence ? ` · ${s.cadence.replace("_", " ")}` : ""}
              {s.dosage ? ` · ${s.dosage}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
