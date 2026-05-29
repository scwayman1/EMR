import type { Metadata } from "next";
import { PackageCheck, Boxes, Scale, FileCheck } from "lucide-react";
import { listDistributors } from "@/lib/leafmart/distributors";
import { DistributorCard } from "@/components/store/DistributorBadge";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "How Leafmart works — our distributor model",
  description:
    "Leafmart is a curated cannabis distributor: we present products we vet but don't hold inventory ourselves. See how fulfillment, returns, COAs, and trust tiers work.",
};

// EMR-302 — Distributor (curated marketplace) operating model, surfaced in
// the storefront architecture.

const MODEL_POINTS = [
  {
    icon: Boxes,
    title: "Curated, not warehoused",
    body: "We present only products we'd stand behind. We don't manufacture them and we don't hold the inventory — vetted distributors and partner brands fulfill orders.",
  },
  {
    icon: PackageCheck,
    title: "Clear responsibility per SKU",
    body: "Every product is tied to a distributor that owns shipping, returns, and COA. The storefront shows who that is before you buy.",
  },
  {
    icon: FileCheck,
    title: "COA + compliance up front",
    body: "Lab Certificates of Analysis, age-gating, and per-state shipping rules are enforced at the distributor layer, not bolted on at checkout.",
  },
  {
    icon: Scale,
    title: "Trust tiers, audited",
    body: "Distributors are graded (verified / preferred / standard) and re-audited on a cadence. The tier rides along on the product card.",
  },
];

const SOURCES = [
  "Guide to the Cannabis Industry — Opal Man Ching Leung",
  "City Bar Justice Center — Cannabis Business & Employment workshop",
  "Developing an online cannabis store paradigm for Cannabis Regulatory Science (ResearchGate)",
  "CA Secretary of State — 10 steps to start a cannabis business",
  "IndicaOnline / Cova / Meadow — cannabis e-commerce delivery guides",
  "CalOSBA — Cannabis Operations BQSG",
];

export default function DistributorsPage() {
  const distributors = listDistributors();
  return (
    <div className="px-4 py-8 lg:px-12">
      <div className="mb-8 max-w-2xl">
        <Eyebrow className="mb-2">Our operating model</Eyebrow>
        <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
          A curated cannabis distributor
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
          Leafmart is a distributor marketplace. We curate the products we believe in and present
          them in one place — but we don&apos;t hold inventory or make the products ourselves. Vetted
          distributors and partner brands fulfill every order, and the storefront makes that
          transparent at every step.
        </p>
      </div>

      <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODEL_POINTS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-surface-raised p-5">
            <p.icon width={22} height={22} className="text-accent" />
            <p className="mt-2.5 font-medium text-text">{p.title}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <Eyebrow className="mb-3">Our distributors</Eyebrow>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {distributors.map((d) => (
            <DistributorCard key={d.id} distributor={d} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Eyebrow className="mb-2">Source framework</Eyebrow>
        <p className="text-[13.5px] text-text-muted">
          Our distributor model is built on, and keeps layering on, an established body of cannabis
          regulatory and e-commerce work:
        </p>
        <ul className="mt-3 grid list-disc grid-cols-1 gap-1.5 pl-5 text-[13px] text-text-muted sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
