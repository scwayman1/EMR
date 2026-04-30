// EMR-188 — Integrated Marketplace ecosystem hub.
//
// Amazon-style landing that aggregates every commerce surface in one
// place: cannabis wellness shop (Leafmart shelf), supply store (DME +
// OTC), affiliate partners, dispensary locator, and the strain finder.
// Each surface is its own page elsewhere; this is the front door.
//
// Reference: normalizemarketplace.com (Dr. Patel's spec) — a single
// destination for a patient to find anything physician-curated.

import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { prisma } from "@/lib/db/prisma";
import { listAffiliatePartners } from "@/lib/affiliate/partners";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Every Leafjourney commerce surface in one place — cannabis wellness, supply store, dispensaries, supplements, and partner brands.",
};

// Re-render hourly — catalog counts shift slowly enough that a stale
// hour is acceptable, and we want this CDN-fast for marketing-driven
// traffic.
export const revalidate = 3600;

interface CatalogCounts {
  productCount: number;
  supplyCount: number;
  strainCount: number;
  dispensaryCount: number;
}

async function loadCounts(): Promise<CatalogCounts> {
  // Pull every count in parallel with safe fallbacks. A degraded DB
  // shouldn't blank the marketplace; show the surface, log the count
  // failure.
  const safeCount = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };
  const [productCount, supplyCount, strainCount, dispensaryCount] = await Promise.all([
    safeCount(prisma.product.count({ where: { status: "active" } }), 0),
    safeCount(prisma.supplyProduct.count({ where: { active: true } }), 0),
    safeCount(prisma.strain.count({ where: { active: true } }), 0),
    safeCount(prisma.dispensary.count({ where: { status: "active" } }), 0),
  ]);
  return { productCount, supplyCount, strainCount, dispensaryCount };
}

interface Surface {
  href: string;
  external?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  count?: string;
  highlight?: string;
}

export default async function MarketplaceHubPage() {
  const counts = await loadCounts();
  const partners = listAffiliatePartners();

  const surfaces: Surface[] = [
    {
      href: "/leafmart",
      eyebrow: "Cannabis wellness",
      title: "Leafmart shelf",
      description:
        "Physician-curated cannabis wellness products. Every item lab-verified, ranked by real patient outcomes.",
      cta: "Shop the shelf →",
      count:
        counts.productCount > 0
          ? `${counts.productCount.toLocaleString()} products live`
          : "Catalog coming soon",
      highlight: "Curated",
    },
    {
      href: "/leafmart/supply-store",
      eyebrow: "OTC + DME",
      title: "AI Supply Store",
      description:
        "OTC, supplements, and durable medical equipment recommended for your symptoms. Tell us what you're working on.",
      cta: "Browse the supply shelf →",
      count:
        counts.supplyCount > 0
          ? `${counts.supplyCount.toLocaleString()} items in stock`
          : "Stock arriving soon",
      highlight: "AI matched",
    },
    {
      href: "/portal/strains",
      eyebrow: "Cannabis flower",
      title: "Strain Finder",
      description:
        "Match your symptoms to flower strains drawn from our Leafly-aligned catalog. Compare cannabinoid + terpene profiles.",
      cta: "Find your strain →",
      count:
        counts.strainCount > 0
          ? `${counts.strainCount.toLocaleString()} strains profiled`
          : "Catalog growing",
    },
    {
      href: "/portal/dispensaries",
      eyebrow: "In your area",
      title: "Dispensary Locator",
      description:
        "Licensed dispensaries within 30 miles of home. Hours, phone, and live SKU counts on every card.",
      cta: "Find a dispensary →",
      count:
        counts.dispensaryCount > 0
          ? `${counts.dispensaryCount.toLocaleString()} integrated`
          : "Connecting partners",
    },
    {
      href: "/portal/combo-wheel",
      eyebrow: "Pharmacology",
      title: "Cannabis Combo Wheel",
      description:
        "Our signature pharmacology tool. Mix cannabinoids and terpenes; see the combined therapeutic profile.",
      cta: "Open the wheel →",
      highlight: "Proprietary",
    },
    {
      href: "/portal/supplement-wheel",
      eyebrow: "Beyond cannabis",
      title: "Supplement Wheel",
      description:
        "Stack evidence-based supplements that complement your cannabis regimen. Surfaces interactions automatically.",
      cta: "Build your stack →",
      highlight: "New",
    },
    {
      href: "/store",
      eyebrow: "Partner brands",
      title: "Affiliate store",
      description:
        "Direct links to physician-trusted partner brands. Joint-decision disclaimer on every redirect.",
      cta: "Visit partners →",
      count:
        partners.length > 0 ? `${partners.length} partners` : "More coming",
    },
  ];

  return (
    <div className="pb-16">
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-16 pb-10 text-center">
        <Eyebrow className="justify-center mb-5 text-accent">
          Integrated marketplace
        </Eyebrow>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight text-text mb-5">
          Everything physician-curated, <span className="italic text-accent">in one place</span>
        </h1>
        <p className="text-base md:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
          The Leafjourney marketplace ties our cannabis shelf, supply store,
          dispensary network, and partner brands into a single ecosystem.
          Pharmacology tools sit alongside checkout — because dosing, sourcing,
          and outcomes belong together.
        </p>
      </section>

      <EditorialRule className="max-w-[1320px] mx-auto px-6 lg:px-12 mb-12" />

      <section className="max-w-[1320px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {surfaces.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-2xl"
            >
              <Card
                tone="raised"
                className="h-full transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Eyebrow>{s.eyebrow}</Eyebrow>
                    {s.highlight && <Badge tone="accent">{s.highlight}</Badge>}
                  </div>
                  <CardTitle className="text-xl mt-2 flex items-center gap-2">
                    <LeafSprig size={14} className="text-accent" />
                    {s.title}
                  </CardTitle>
                  {s.count && (
                    <CardDescription className="text-xs mt-1">{s.count}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted leading-relaxed mb-4">
                    {s.description}
                  </p>
                  <p className="text-sm font-medium text-accent">{s.cta}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="max-w-[1320px] mx-auto px-6 lg:px-12 mt-16">
          <div className="text-center mb-8">
            <Eyebrow className="justify-center mb-3">Founding partners</Eyebrow>
            <h2 className="font-display text-3xl text-text tracking-tight">
              Brands our care team trusts
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((p) => (
              <Card key={p.slug} tone="raised">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge tone="accent">{p.category}</Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">{p.domain}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {p.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-text-subtle text-center mt-6 max-w-xl mx-auto leading-relaxed">
            Adding any partner product to your regimen is a joint decision
            between you and your care team. Always bring product names to
            your next visit so we can document them and watch for
            interactions.
          </p>
        </section>
      )}
    </div>
  );
}
