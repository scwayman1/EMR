"use client";

import Link from "next/link";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

interface Cannabinoid {
  slug: string;
  name: string;
  query: string;
  desc: string;
  keywords: string[];
  bg: string;
  deep: string;
}

const CANNABINOIDS: Cannabinoid[] = [
  {
    slug: "cbd",
    name: "CBD",
    query: "CBD",
    desc: "The everyday cannabinoid — non-intoxicating, broadly studied.",
    keywords: ["cbd"],
    bg: "var(--sage)",
    deep: "var(--leaf)",
  },
  {
    slug: "cbn",
    name: "CBN",
    query: "CBN",
    desc: "The night cannabinoid — paired with sleep routines.",
    keywords: ["cbn"],
    bg: "var(--lilac)",
    deep: "#5C4972",
  },
  {
    slug: "thc",
    name: "THC",
    query: "THC",
    desc: "The classic cannabinoid — federal & program rules apply.",
    keywords: ["thc"],
    bg: "var(--peach)",
    deep: "#9E5621",
  },
  {
    slug: "cbg",
    name: "CBG",
    query: "CBG",
    desc: "The mother cannabinoid — early research, focused effects.",
    keywords: ["cbg"],
    bg: "var(--butter)",
    deep: "#8A6A1F",
  },
  {
    slug: "delta-8",
    name: "Delta-8",
    query: "Delta-8",
    desc: "A milder THC analog — distinct profile and rules.",
    keywords: ["delta-8", "delta 8"],
    bg: "var(--rose)",
    deep: "#9E4D45",
  },
  {
    slug: "terpenes",
    name: "Terpenes",
    query: "Terpenes",
    desc: "The aromatic compounds — often paired with cannabinoids.",
    keywords: ["terpene", "full-spectrum"],
    bg: "var(--mint)",
    deep: "var(--leaf)",
  },
];

function countFor(keywords: string[]): number {
  return DEMO_PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.partner} ${p.formatLabel} ${p.support}`.toLowerCase();
    return keywords.some((k) => hay.includes(k));
  }).length;
}

export function CannabinoidBrowser({ heading = true }: { heading?: boolean }) {
  return (
    <section>
      {heading && (
        <>
          <p className="eyebrow text-[var(--leaf)] mb-2.5">Shop by cannabinoid</p>
          <h2 className="font-display text-[32px] sm:text-[40px] font-normal tracking-[-1px] leading-[1.05] text-[var(--ink)]">
            Or start with the <em className="font-accent not-italic text-[var(--leaf)]">molecule</em>.
          </h2>
          <p className="mt-3 text-[15px] text-[var(--text-soft)] max-w-[560px] leading-relaxed">
            Pick a cannabinoid to filter the shelf. Every product is lab-verified for what's on the label.
          </p>
        </>
      )}
      <div className={`${heading ? "mt-7" : ""} grid grid-cols-2 sm:grid-cols-3 gap-4`}>
        {CANNABINOIDS.map((c) => {
          const count = countFor(c.keywords);
          return (
            <Link
              key={c.slug}
              href={`/leafmart/search?q=${encodeURIComponent(c.query)}`}
              className="card-lift rounded-[24px] p-6 flex flex-col"
              style={{ background: c.bg, minHeight: 184 }}
              aria-label={`Search products containing ${c.name}`}
            >
              <div className="flex-1">
                <h3
                  className="font-display text-[28px] font-medium tracking-tight"
                  style={{ color: c.deep }}
                >
                  {c.name}
                </h3>
                <p className="mt-2 text-[13px] text-[var(--text-soft)] leading-snug">{c.desc}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/65 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-[var(--ink)] self-start">
                {count} {count === 1 ? "product" : "products"}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
