"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";

const PRODUCTS = [
  {
    name: "PhytoRx Premium CBD Oil",
    brand: "PhytoRx",
    category: "Tinctures",
    description:
      "Full-spectrum CBD tincture crafted for therapeutic use. Third-party tested, physician-recommended.",
    price: "$79.99",
    url: "https://phytorx.co",
    badge: "Best seller",
  },
  {
    name: "Flower Powered Topical Balm",
    brand: "Flower Powered Products",
    category: "Topicals",
    description:
      "Soothing topical balm with CBD, menthol, and arnica. Targeted relief for joints and muscles.",
    price: "$44.99",
    url: "https://flowerpoweredproductsllc.com",
    badge: null,
  },
  {
    name: "AULV Wellness Capsules",
    brand: "AULV",
    category: "Capsules",
    description:
      "Precision-dosed CBD capsules for consistent daily wellness. Vegan, gluten-free, lab-tested.",
    price: "$59.99",
    url: "https://aulv.org",
    badge: "New",
  },
  {
    name: "PhytoRx Sleep Formula",
    brand: "PhytoRx",
    category: "Tinctures",
    description:
      "CBN + CBD blend designed to support restful sleep. Taken 30 minutes before bedtime.",
    price: "$89.99",
    url: "https://phytorx.co",
    badge: null,
  },
  {
    name: "Flower Powered Pain Cream",
    brand: "Flower Powered Products",
    category: "Topicals",
    description:
      "High-potency CBD cream with camphor and eucalyptus. Fast-absorbing, non-greasy formula.",
    price: "$54.99",
    url: "https://flowerpoweredproductsllc.com",
    badge: null,
  },
  {
    name: "AULV Focus Gummies",
    brand: "AULV",
    category: "Edibles",
    description:
      "CBD + CBG gummies formulated for clarity and focus. Natural fruit flavors, 25mg per gummy.",
    price: "$39.99",
    url: "https://aulv.org",
    badge: "Popular",
  },
];

const CATEGORIES = ["All", "Tinctures", "Topicals", "Capsules", "Edibles"];

export default function StorePage() {
  const [category, setCategory] = useState("All");
  const [disclaimerUrl, setDisclaimerUrl] = useState<string | null>(null);

  const filtered =
    category === "All"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === category);

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 85% 10%, var(--highlight-soft), transparent 65%)," +
            "radial-gradient(ellipse 50% 60% at 10% 90%, var(--accent-soft), transparent 60%)",
        }}
      />

      {/* Nav */}
      <nav className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/about"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            About
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Start your care</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-12 pb-10 text-center">
        <Eyebrow className="mb-6 justify-center">Curated wellness</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-text max-w-3xl mx-auto">
          The <span className="text-accent">Leafjourney</span> Store
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-6 max-w-xl mx-auto leading-relaxed">
          Physician-curated cannabis wellness products from trusted partners.
          Every product is third-party tested and clinician-recommended.
        </p>
      </section>

      {/* Category filter */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-surface-raised text-text-muted border border-border hover:border-border-strong hover:text-text"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Products grid */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <article
              key={product.name}
              className="relative bg-surface-raised rounded-2xl border border-border p-7 shadow-sm card-hover flex flex-col"
            >
              {product.badge && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent px-2.5 py-1 rounded-full">
                  {product.badge}
                </span>
              )}

              {/* Product icon placeholder */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-highlight/10 flex items-center justify-center mb-5">
                <LeafSprig size={28} className="text-accent" />
              </div>

              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                {product.brand} &middot; {product.category}
              </span>
              <h3 className="font-display text-xl text-text tracking-tight mt-2">
                {product.name}
              </h3>
              <p className="text-sm text-text-muted mt-2 leading-relaxed flex-1">
                {product.description}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="font-display text-2xl text-text tracking-tight">
                  {product.price}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDisclaimerUrl(product.url)}
                >
                  View product
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Partner section */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-2xl mx-auto text-center">
            <Eyebrow className="mb-4 justify-center">Partner brands</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
              Trusted by leading cannabis wellness brands
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-text-muted">
              <span className="font-display text-xl tracking-tight">PhytoRx</span>
              <span className="text-border-strong">|</span>
              <span className="font-display text-xl tracking-tight">Flower Powered</span>
              <span className="text-border-strong">|</span>
              <span className="font-display text-xl tracking-tight">AULV</span>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer modal */}
      {disclaimerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-raised rounded-2xl border border-border shadow-xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center">
                <LeafSprig size={20} className="text-highlight" />
              </div>
              <h3 className="font-display text-xl text-text tracking-tight">
                Before you go
              </h3>
            </div>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              You are leaving Leafjourney to visit a partner website.
              Please consult your healthcare provider before considering
              these products. Cannabis products are not FDA-approved
              medications and individual results may vary. This is a joint
              decision between you and your care team.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setDisclaimerUrl(null)}
              >
                Go back
              </Button>
              <a
                href={disclaimerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
                onClick={() => setDisclaimerUrl(null)}
              >
                <Button size="md" className="w-full">
                  Continue to site
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-8 flex flex-col gap-4">
          <p className="text-xs italic text-text-muted leading-relaxed max-w-2xl">
            Cannabis should be considered a medicine so please use it carefully
            and judiciously. Do not abuse Cannabis and please respect the plant
            and its healing properties.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <Wordmark size="sm" />
            <p className="text-xs text-text-subtle">
              &copy; {new Date().getFullYear()} Leafjourney. A
              demonstration product — not a substitute for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
