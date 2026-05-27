import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import {
  CHARITIES,
  formatUSD,
  summarizeLedger,
  type CharityCategory,
  type DonationLedgerEntry,
} from "@/lib/domain/philanthropy";

export const metadata = { title: "Philanthropy" };

// ---------------------------------------------------------------------------
// EMR-105 — Philanthropy / donations module
//
// Mirror of the volunteer page for monetary giving. Patients see curated
// mission-aligned charities, lifetime giving stats, and a frictionless
// "donate" outbound link. Recurring pledges flow through the existing
// payments rails (out of scope here — UI hooks only).
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<CharityCategory, string> = {
  "patient-access": "Patient access",
  "mental-health": "Mental health",
  research: "Research",
  veterans: "Veterans",
  "harm-reduction": "Harm reduction",
  "social-equity": "Social equity",
};

export default async function PhilanthropyPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });
  if (!patient) redirect("/portal/intake");

  // Demo ledger — wired later to a real giving table. Keeps the UI honest.
  const ledger: DonationLedgerEntry[] = buildDemoLedger(patient.id);
  const summary = summarizeLedger(ledger);

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <Card tone="ambient" className="mb-8 grain">
        <div className="relative z-10 px-6 md:px-10 py-8 md:py-12">
          <Eyebrow className="mb-3">Philanthropy</Eyebrow>
          <h1 className="font-display text-3xl md:text-[2.5rem] text-text tracking-tight leading-[1.08]">
            Healing yourself, helping others.
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-xl">
            Service is the most evidence-backed wellbeing intervention there
            is. We curate charities aligned with cannabis access, mental
            health, and patient advocacy — and we match the first $25 of every
            monthly recurring pledge.
          </p>
          <div className="mt-6 flex items-end gap-8">
            <Stat label="Lifetime giving" value={formatUSD(summary.totalGivenCents)} />
            <Stat label="Matched by Leafjourney" value={formatUSD(summary.totalMatchedCents)} />
            <Stat
              label="Charities supported"
              value={`${summary.charitiesSupported}`}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Curated charities</Eyebrow>
        <Link
          href="/portal/volunteer"
          className="text-xs text-accent hover:underline"
        >
          Volunteer hours →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CHARITIES.map((c) => (
          <Card key={c.id} tone="raised">
            <CardContent className="py-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-display text-lg text-text leading-snug">
                  {c.name}
                </h2>
                <Badge tone="accent" className="shrink-0 text-[10px]">
                  {CATEGORY_LABELS[c.category]}
                </Badge>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {c.blurb}
              </p>
              <p className="text-xs text-accent mt-3 italic">
                Why on our list: {c.whyOnList}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Donate at {prettyDomain(c.url)} ↗
                </a>
                {c.ein && (
                  <span className="text-[10px] text-text-subtle">
                    EIN {c.ein}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditorialRule className="my-10" />

      <Card>
        <CardContent className="py-6">
          <Eyebrow className="mb-3">Your giving history</Eyebrow>
          {ledger.length === 0 ? (
            <p className="text-sm text-text-muted">
              No gifts logged yet. Once you set up a recurring pledge, every
              donation will land here with the Leafjourney match alongside.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {ledger.slice(0, 6).map((e, i) => {
                const charity = CHARITIES.find((c) => c.id === e.charityId);
                return (
                  <li
                    key={i}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <span className="text-text">{charity?.name ?? e.charityId}</span>
                    <span className="text-text-subtle">
                      {new Date(e.date).toLocaleDateString()}
                    </span>
                    <span className="font-display text-base text-text tabular-nums">
                      {formatUSD(e.amountCents)}
                    </span>
                    {e.matched ? (
                      <Badge tone="success" className="text-[10px]">
                        Matched
                      </Badge>
                    ) : (
                      <span className="w-[60px]" aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-text-subtle text-center mt-10 max-w-xl mx-auto">
        Leafjourney does not retain donation funds. We forward every dollar to
        the charity of your choice and show you the receipt. Match programs
        are funded from operating margin and capped quarterly.
      </p>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-text tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle mt-1">
        {label}
      </p>
    </div>
  );
}

function prettyDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Demo ledger — derived deterministically from patient id so different
 * patients see different shapes. Replace with a real giving table when
 * the payments path lands.
 */
function buildDemoLedger(patientId: string): DonationLedgerEntry[] {
  const seed = patientId
    .split("")
    .reduce((sum, c) => sum + c.charCodeAt(0), 0);
  if (seed % 3 === 0) return [];
  const today = new Date();
  return [0, 1, 2, 3].map((i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    return {
      date: d.toISOString().slice(0, 10),
      charityId: CHARITIES[(seed + i) % CHARITIES.length].id,
      amountCents: 1000 + ((seed + i) % 4) * 500,
      matched: i === 0,
    };
  });
}
