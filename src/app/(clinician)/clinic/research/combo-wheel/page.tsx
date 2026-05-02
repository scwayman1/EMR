// EMR-181 — Cannabis Combo Wheel Front and Center.
//
// The wheel was previously a side panel inside the research console.
// Provider feedback (especially after the Aspen pilot) was: "this is
// the most-used research tool — make it the hero, not a card on a
// dashboard." This page now renders the full-width production
// ComboWheel and slots provider-specific usage analytics directly
// underneath so attendings can see how their cohort engages with each
// compound without bouncing through the analytics tab.

import Link from "next/link";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { ComboWheel } from "@/components/education/ComboWheel";
import { getComboWheelCompounds } from "@/lib/domain/combo-wheel";

export const metadata = { title: "Cannabis Combo Wheel" };

interface ProviderUsage {
  compoundId: string;
  compoundName: string;
  color: string;
  patients: number;
  averageDose: number | null;
}

async function loadProviderUsage(
  providerUserId: string,
): Promise<ProviderUsage[]> {
  // Aggregate active dosing regimens prescribed by this provider, grouped by
  // product mapping → compound. The schema doesn't carry a direct compound
  // FK on regimens, so we approximate by joining the regimen's product
  // category to the compound id (e.g. THC-dominant -> "thc"). When that
  // mapping isn't available the row is dropped — this is a guidance signal,
  // not a clinical metric.
  try {
    const compoundUsage = await prisma.dosingRegimen.findMany({
      where: {
        active: true,
        prescribedById: providerUserId,
      },
      select: {
        calculatedThcMgPerDose: true,
        calculatedCbdMgPerDose: true,
        patientId: true,
        product: {
          select: {
            id: true,
            name: true,
            thcContent: true,
            cbdContent: true,
          },
        },
      },
      take: 500,
    });

    const buckets = new Map<
      string,
      { name: string; color: string; patients: Set<string>; doses: number[] }
    >();

    function add(
      id: string,
      name: string,
      color: string,
      patientId: string,
      dose: number | null | undefined,
    ) {
      const entry =
        buckets.get(id) ??
        ({ name, color, patients: new Set<string>(), doses: [] } as {
          name: string;
          color: string;
          patients: Set<string>;
          doses: number[];
        });
      entry.patients.add(patientId);
      if (typeof dose === "number" && dose > 0) entry.doses.push(dose);
      buckets.set(id, entry);
    }

    for (const r of compoundUsage) {
      const thc = r.calculatedThcMgPerDose ?? r.product?.thcContent ?? null;
      const cbd = r.calculatedCbdMgPerDose ?? r.product?.cbdContent ?? null;
      if (thc && thc > 0) add("thc", "THC", "#1F8A4D", r.patientId, thc);
      if (cbd && cbd > 0) add("cbd", "CBD", "#1F6FE0", r.patientId, cbd);
    }

    return Array.from(buckets.entries())
      .map(([id, entry]) => ({
        compoundId: id,
        compoundName: entry.name,
        color: entry.color,
        patients: entry.patients.size,
        averageDose:
          entry.doses.length > 0
            ? entry.doses.reduce((a, b) => a + b, 0) / entry.doses.length
            : null,
      }))
      .sort((a, b) => b.patients - a.patients);
  } catch {
    // Schema mismatches between branches are common during phased rollouts;
    // fail open so the wheel still renders.
    return [];
  }
}

export default async function ComboWheelPage() {
  const user = await requireRole("clinician");
  const [compounds, usage] = await Promise.all([
    getComboWheelCompounds(),
    loadProviderUsage(user.id),
  ]);

  const totalPatients = usage.reduce((acc, u) => Math.max(acc, u.patients), 0);

  return (
    <PageShell maxWidth="max-w-[1480px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Eyebrow>Pharmacology hero · Research</Eyebrow>
        <div className="flex items-center gap-2">
          <Link href="/clinic/research">
            <Button variant="ghost" size="sm">
              Research console
            </Button>
          </Link>
          <Link href="/clinic/cohorts">
            <Button variant="secondary" size="sm">
              Cohorts
            </Button>
          </Link>
        </div>
      </div>

      <PageHeader
        title="Cannabis Combo Wheel"
        description="Tap two or more compounds to see shared targets, combined benefits, and what to watch for. Your prescribing analytics for each compound appear below."
      />

      <ComboWheel
        context="clinical"
        showFooter={false}
        initialCompounds={compounds}
      />

      <EditorialRule className="my-10" />

      <div className="mb-4">
        <Eyebrow>Your prescribing analytics</Eyebrow>
        <h2 className="font-display text-xl text-text tracking-tight mt-2">
          How your cohort uses each compound
        </h2>
        <p className="text-sm text-text-muted mt-1 max-w-2xl">
          Live aggregates from active regimens you&apos;ve authored. Bars
          scale to your highest-prescribed compound; doses are average mg per
          dose across active patients.
        </p>
      </div>

      {usage.length === 0 ? (
        <Card tone="raised">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-text-muted">
              No active regimens yet. Once you start prescribing, this panel
              will populate automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {usage.map((u) => {
            const pct = totalPatients > 0 ? (u.patients / totalPatients) * 100 : 0;
            return (
              <Card tone="raised" key={u.compoundId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: u.color }}
                        aria-hidden
                      />
                      {u.compoundName}
                    </CardTitle>
                    <Badge tone="accent">
                      {u.patients} patient{u.patients === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative h-2 bg-surface-muted rounded-full overflow-hidden mb-3">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(4, pct)}%`,
                        backgroundColor: u.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-muted">
                    Avg dose:{" "}
                    <span className="font-medium text-text tabular-nums">
                      {u.averageDose !== null
                        ? `${u.averageDose.toFixed(1)} mg`
                        : "—"}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
