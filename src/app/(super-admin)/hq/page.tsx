import Link from "next/link";
import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Leafjourney HQ",
  description: "Super-admin fleet operations dashboard.",
};

export const dynamic = "force-dynamic";

type NavLink = { label: string; href: string };

const HQ_NAV: NavLink[] = [
  { label: "Dashboard", href: "/admin/hq" },
  { label: "Practices", href: "/practices" },
  { label: "Admins", href: "/admin/console" },
  { label: "Onboarding", href: "/onboarding" },
  { label: "Templates", href: "/templates" },
  { label: "History", href: "/admin/history" },
  { label: "Audit Log", href: "/admin/audit-log" },
];

type Placeholder = {
  title: string;
  description: string;
  ticket: string;
};

const PLACEHOLDERS: Placeholder[] = [
  {
    title: "Hero KPIs",
    description: "Fleet-wide MRR, active practices, encounters, and gross margin.",
    ticket: "EMR-733",
  },
  {
    title: "Revenue",
    description: "Trailing revenue, billable mix, and per-practice contribution.",
    ticket: "EMR-735",
  },
  {
    title: "Funnel",
    description: "Onboarding-to-publish conversion across the fleet.",
    ticket: "EMR-736",
  },
  {
    title: "Modality Mix",
    description: "Cannabis vs. non-cannabis split across published configurations.",
    ticket: "EMR-739",
  },
  {
    title: "Leaderboards",
    description: "Top practices by revenue, encounters, and activation velocity.",
    ticket: "EMR-744",
  },
  {
    title: "Activity Stream",
    description: "Cross-fleet timeline of publishes, role grants, and exceptions.",
    ticket: "EMR-744",
  },
];

export default async function LeafjourneyHqPage() {
  const user = await requireUser();

  return (
    <PageShell maxWidth="max-w-[1240px]">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
        <div>
          <Eyebrow className="mb-3">Internal</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Leafjourney HQ
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-xl">
            Fleet operations at a glance. Drill into any surface from the nav below.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end text-xs text-text-subtle">
          <span className="uppercase tracking-[0.18em] text-[10px] mb-1">Signed in</span>
          <span className="text-sm text-text">{user.email}</span>
          <span className="mt-1">Sign out from the sidebar identity menu.</span>
        </div>
      </header>

      <nav aria-label="HQ navigation" className="mb-12">
        <ul className="flex flex-wrap gap-1 border-b border-border/80 pb-px">
          {HQ_NAV.map((item) => {
            const isActive = item.href === "/admin/hq";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "inline-flex items-center px-4 py-2.5 text-sm font-medium text-text border-b-2 border-text -mb-px transition-colors"
                      : "inline-flex items-center px-4 py-2.5 text-sm text-text-muted hover:text-text border-b-2 border-transparent hover:border-border-strong -mb-px transition-colors"
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="hero-kpis-heading" className="mb-10">
        <h2 id="hero-kpis-heading" className="sr-only">
          Hero KPIs
        </h2>
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle>Hero KPIs</CardTitle>
              <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">
                EMR-733
              </span>
            </div>
            <CardDescription>
              Fleet-wide MRR, active practices, encounters, and gross margin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {["MRR", "Active practices", "Encounters / 30d", "Gross margin"].map((label) => (
                <div key={label}>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-subtle mb-2">
                    {label}
                  </div>
                  <div className="font-display text-3xl text-text tracking-tight">—</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-subtle mt-6">Coming soon</p>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Dashboard panels" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PLACEHOLDERS.filter((p) => p.title !== "Hero KPIs").map((panel) => (
          <Card key={panel.title}>
            <CardHeader>
              <div className="flex items-baseline justify-between gap-3">
                <CardTitle>{panel.title}</CardTitle>
                <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">
                  {panel.ticket}
                </span>
              </div>
              <CardDescription>{panel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center min-h-[140px] rounded-lg border border-dashed border-border-strong/60 bg-surface-muted/30">
                <div className="text-center px-6 py-8">
                  <div className="font-display text-2xl text-text-muted tracking-tight">—</div>
                  <p className="text-xs text-text-subtle mt-2">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}
