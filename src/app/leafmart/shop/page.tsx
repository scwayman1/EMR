import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LeafSprig } from "@/components/ui/ornament";
import { getPublicCategories } from "@/lib/marketplace/public-queries";
import type { MarketplaceCategory } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shop by what you need",
  description:
    "Browse Leafmart by condition, goal, format, or curated collection. Every category is physician-reviewed.",
};

interface CategoryGroup {
  id: "symptom" | "goal" | "format" | "collection" | "other";
  title: string;
  description: string;
}

const GROUPS: CategoryGroup[] = [
  {
    id: "symptom",
    title: "By what's bothering you",
    description:
      "Categories oriented around the concerns patients bring to us most often.",
  },
  {
    id: "goal",
    title: "By what you're aiming for",
    description:
      "A positive framing — where do you want your day (or night) to land?",
  },
  {
    id: "format",
    title: "By how you take it",
    description:
      "Tinctures feel different from edibles. Start where you're comfortable.",
  },
  {
    id: "collection",
    title: "Curated picks",
    description:
      "Our care team's picks + customer favorites + beginner-friendly shelves.",
  },
];

function classify(type: string): CategoryGroup["id"] {
  if (type === "symptom" || type === "goal" || type === "format" || type === "collection") {
    return type;
  }
  return "other";
}

export default async function LeafmartShopDirectoryPage() {
  const allCategories = await getPublicCategories();

  const grouped = new Map<CategoryGroup["id"], MarketplaceCategory[]>();
  for (const cat of allCategories) {
    const g = classify(cat.type);
    const arr = grouped.get(g) ?? [];
    arr.push(cat);
    grouped.set(g, arr);
  }
  for (const arr of grouped.values()) {
    arr.sort(
      (a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name),
    );
  }

  const totalProducts = allCategories.reduce((sum, c) => sum + c.productCount, 0);

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-subtle mb-6">
        <Link href="/leafmart" className="hover:text-text transition-colors">
          Leafmart
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text">Shop</span>
      </div>

      <div className="max-w-3xl mb-10">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-text">
          Shop by what you need.
        </h1>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          Every category here has been physician-reviewed. Browse by the
          concern on your mind, the mood you&apos;re aiming for, or the
          format you already know works for you.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/leafmart/products">
            <Button size="sm" variant="primary">
              See all products →
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Condition / intent quick chips ─────────────────── */}
      <QuickChips categories={allCategories} />

      {/* ── Grouped directory ──────────────────────────────── */}
      {allCategories.length === 0 ? (
        <EmptyState
          title="Catalog building"
          description="Check back soon — we&apos;re curating the shelves."
        />
      ) : (
        <div className="space-y-14 mt-12">
          {GROUPS.map((group) => {
            const categories = grouped.get(group.id);
            if (!categories || categories.length === 0) return null;
            return (
              <section key={group.id}>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold tracking-tight text-text">
                    {group.title}
                  </h2>
                  <p className="text-sm text-text-muted mt-1 max-w-2xl">
                    {group.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <CategoryTile key={cat.id} category={cat} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── Stats / trust strip ────────────────────────────── */}
      <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Categories" value={allCategories.length.toString()} />
        <StatTile label="Products" value={totalProducts.toString()} />
        <StatTile
          label="Clinician-picked"
          value={allCategories
            .filter((c) => c.slug === "clinician-picks")
            .reduce((sum, c) => sum + c.productCount, 0)
            .toString()}
        />
        <StatTile
          label="Beginner-friendly"
          value={allCategories
            .filter((c) => c.slug === "beginner-friendly")
            .reduce((sum, c) => sum + c.productCount, 0)
            .toString()}
        />
      </div>
    </div>
  );
}

function QuickChips({ categories }: { categories: MarketplaceCategory[] }) {
  const QUICK_SLUGS = [
    "sleep",
    "pain-support",
    "anxiety",
    "calm",
    "focus",
    "recovery",
    "energy",
  ];
  const chips = QUICK_SLUGS.map((slug) =>
    categories.find((c) => c.slug === slug),
  ).filter((c): c is MarketplaceCategory => Boolean(c));
  if (chips.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-3">
        Quick browse
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.id}
            href={`/leafmart/category/${c.slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
          >
            {c.icon && (
              <span aria-hidden="true" className="text-accent">
                {c.icon}
              </span>
            )}
            {c.name}
            <span className="text-xs text-text-subtle">{c.productCount}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryTile({ category }: { category: MarketplaceCategory }) {
  return (
    <Link
      href={`/leafmart/category/${category.slug}`}
      className="group block h-full"
    >
      <div className="relative h-full rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-border-strong overflow-hidden">
        {/* Accent gradient wash — only on hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-soft/0 to-accent-soft/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
        <div className="relative flex items-start justify-between mb-4">
          <LeafSprig size={20} className="text-accent/80" />
          <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle tabular-nums">
            {category.productCount}
          </span>
        </div>
        <p className="relative font-display text-lg tracking-tight text-text group-hover:text-accent transition-colors">
          {category.name}
        </p>
        {category.description && (
          <p className="relative text-xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-display text-text tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-text-subtle mt-1">
        {label}
      </p>
    </div>
  );
}
