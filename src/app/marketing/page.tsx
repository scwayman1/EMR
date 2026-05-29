import Link from "next/link";
import { Target, TrendingUp, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MARKETING_SEGMENTS,
  valuePropFor,
  GTM_TIMELINE,
  shippedQuarters,
  totalAddressableProviders,
} from "@/lib/marketing/business-plan";

export const metadata = {
  title: "Marketing & Target Groups — Leafjourney",
  description:
    "Who Leafjourney serves and why: the five practice segments we target, the value we promise each, and the go-to-market plan to reach them.",
};

// EMR-153 — Marketing + business plan + target groups. The prospect-facing
// view of who we serve. Pulls from the shared business-plan data so the
// marketing site and the internal plan never drift.

const STATUS_TONE = {
  shipped: "success",
  in_progress: "warning",
  planned: "neutral",
} as const;

const STATUS_LABEL = {
  shipped: "Shipped",
  in_progress: "In progress",
  planned: "Planned",
} as const;

export default function MarketingPage() {
  const tam = totalAddressableProviders();
  const shipped = shippedQuarters().length;

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main id="main-content">
        {/* Hero */}
        <section className="mx-auto max-w-[1280px] px-6 pb-10 pt-12 text-center lg:px-12">
          <Eyebrow className="mb-5 justify-center">Marketing &amp; growth</Eyebrow>
          <h1 className="mx-auto max-w-3xl font-display text-4xl leading-[1.05] tracking-tight text-text md:text-5xl">
            Who we serve. <span className="text-accent">What we promise them.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-text-muted">
            Five practice segments, one platform. Here&apos;s exactly who Leafjourney is built for, the
            pain we solve for each, and the plan to reach them.
          </p>
        </section>

        {/* Summary tiles */}
        <section className="mx-auto max-w-[1280px] px-6 pb-14 lg:px-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-raised p-6">
              <Users width={22} height={22} className="text-accent" />
              <p className="mt-3 font-display text-3xl tabular-nums text-text">
                {tam.toLocaleString()}
              </p>
              <p className="text-[13px] text-text-muted">Addressable providers across segments</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-6">
              <Target width={22} height={22} className="text-accent" />
              <p className="mt-3 font-display text-3xl tabular-nums text-text">{MARKETING_SEGMENTS.length}</p>
              <p className="text-[13px] text-text-muted">Target segments with tailored value props</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-6">
              <TrendingUp width={22} height={22} className="text-accent" />
              <p className="mt-3 font-display text-3xl tabular-nums text-text">{shipped}</p>
              <p className="text-[13px] text-text-muted">Go-to-market quarters already shipped</p>
            </div>
          </div>
        </section>

        {/* Target segments */}
        <section className="mx-auto max-w-[1280px] px-6 pb-16 lg:px-12">
          <Eyebrow className="mb-3">Target groups</Eyebrow>
          <h2 className="mb-6 font-display text-3xl tracking-tight text-text">Built for these five</h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {MARKETING_SEGMENTS.map((seg) => {
              const vp = valuePropFor(seg.id);
              return (
                <div key={seg.id} className="rounded-2xl border border-border bg-surface-raised p-7 shadow-sm">
                  <h3 className="font-display text-xl tracking-tight text-text">{seg.name}</h3>
                  <p className="mt-1 text-[14px] text-text-muted">{seg.who}</p>

                  <dl className="mt-4 space-y-2.5 text-[13.5px]">
                    <div>
                      <dt className="font-medium text-text">Their pain</dt>
                      <dd className="text-text-muted">{seg.pain}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-text">Our promise</dt>
                      <dd className="text-text-muted">{seg.promise}</dd>
                    </div>
                  </dl>

                  {vp && (
                    <div className="mt-4 rounded-xl bg-accent-soft/40 p-4">
                      <p className="font-display text-[15px] tracking-tight text-accent">{vp.headline}</p>
                      <p className="mt-0.5 text-[13px] text-text-muted">{vp.subhead}</p>
                      <ul className="mt-3 space-y-1.5">
                        {vp.outcomes.map((o) => (
                          <li key={o} className="flex items-start gap-2 text-[12.5px] text-text">
                            <CheckCircle2 width={14} height={14} className="mt-0.5 shrink-0 text-accent" />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <EditorialRule className="mx-auto max-w-[1280px] px-6 lg:px-12" />

        {/* Go-to-market timeline */}
        <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12">
          <Eyebrow className="mb-3">Go-to-market</Eyebrow>
          <h2 className="mb-6 font-display text-3xl tracking-tight text-text">The plan, quarter by quarter</h2>
          <ol className="space-y-4">
            {GTM_TIMELINE.map((m) => (
              <li key={m.quarter} className="rounded-2xl border border-border bg-surface-raised p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg tracking-tight text-text">{m.quarter}</span>
                    <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                  </div>
                  <span className="text-[13px] font-medium text-text-muted">{m.theme}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                      Product
                    </p>
                    <ul className="space-y-1 text-[13px] text-text-muted">
                      {m.productMoves.map((p) => (
                        <li key={p}>· {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                      Sales &amp; marketing
                    </p>
                    <ul className="space-y-1 text-[13px] text-text-muted">
                      {m.salesMoves.map((s) => (
                        <li key={s}>· {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-[13px] text-text">
                  <span className="font-medium">Target:</span> {m.target}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1280px] px-6 pb-24 lg:px-12">
          <div className="rounded-3xl border border-border bg-surface-raised p-10 text-center md:p-14">
            <Eyebrow className="mb-4 justify-center">Go deeper</Eyebrow>
            <h2 className="font-display text-3xl tracking-tight text-text md:text-4xl">
              Want the full business plan?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-text-muted">
              See the complete competitive analysis, pricing, and roadmap — or book a demo to talk
              through your segment.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/about/business">
                <Button size="lg" trailingIcon={<ArrowRight width={16} height={16} />}>
                  Read the business plan
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="ghost">
                  Compare pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
