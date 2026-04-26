import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { LeafmartProductGrid } from "@/components/leafmart/LeafmartProductCard";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import {
  findGuideByFormat,
  findGuideBySlug,
  listGuides,
  type DosingGuide,
} from "@/lib/leafmart/dosing-guides";

export async function generateStaticParams() {
  return listGuides().map((g) => ({ slug: g.slug }));
}

function resolveGuide(slug: string): { guide: DosingGuide; product?: typeof DEMO_PRODUCTS[number] } | null {
  // Direct match by guide slug (e.g., "tinctures")
  const direct = findGuideBySlug(slug);
  if (direct) return { guide: direct };

  // Backward-compat: if slug matches a product, surface the guide for that product's format
  const product = DEMO_PRODUCTS.find((p) => p.slug === slug);
  if (product) {
    const guide = findGuideByFormat(product.format);
    if (guide) return { guide, product };
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const resolved = resolveGuide(params.slug);
  if (!resolved) return { title: "Dosing guide" };
  const { guide, product } = resolved;
  return {
    title: product
      ? `${product.name} — dosing guide`
      : `${guide.title} — dosing guide`,
    description: guide.subtitle,
  };
}

export default function DosingGuidePage({ params }: { params: { slug: string } }) {
  const resolved = resolveGuide(params.slug);
  if (!resolved) notFound();
  const { guide, product } = resolved;

  const relatedFromGuide = guide.relatedSlugs
    .map((s) => DEMO_PRODUCTS.find((p) => p.slug === s))
    .filter((p): p is (typeof DEMO_PRODUCTS)[number] => Boolean(p));
  const fallbackRelated = DEMO_PRODUCTS.filter(
    (p) => !relatedFromGuide.some((r) => r.slug === p.slug),
  ).slice(0, 3 - relatedFromGuide.length);
  const related = [...relatedFromGuide, ...fallbackRelated].slice(0, 3);

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="px-4 sm:px-6 lg:px-14 pt-5 sm:pt-6 max-w-[1440px] mx-auto">
        <ol className="flex items-center gap-2 text-[11.5px] sm:text-xs text-[var(--muted)] flex-wrap">
          <li><Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link></li>
          <li aria-hidden="true">·</li>
          {product ? (
            <>
              <li><Link href={`/leafmart/products/${product.slug}`} className="hover:text-[var(--leaf)]">{product.name}</Link></li>
              <li aria-hidden="true">·</li>
            </>
          ) : null}
          <li className="text-[var(--text)]">Dosing guide</li>
        </ol>
      </nav>

      {/* HERO */}
      <section className="px-4 sm:px-6 lg:px-14 py-8 sm:py-10 max-w-[1440px] mx-auto lm-fade-in">
        <div
          className="rounded-[28px] sm:rounded-[32px] grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 sm:gap-8 items-center overflow-hidden"
          style={{ background: guide.bg }}
        >
          <div className="flex justify-center pt-6 lg:pt-0 px-4">
            <ProductSilhouette
              shape={guide.shape}
              bg={guide.bg}
              deep={guide.deep}
              height={320}
              big
            />
          </div>
          <div className="px-6 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-14">
            <p className="eyebrow mb-3" style={{ color: guide.deep }}>
              Dosing guide · {guide.title}
            </p>
            <h1 className="font-display text-[34px] sm:text-[44px] lg:text-[60px] leading-[1.05] sm:leading-[1.02] font-normal tracking-[-1.2px] sm:tracking-[-1.6px] text-[var(--ink)] mb-4">
              How to use
              <br />
              <em className="font-accent not-italic">{guide.title.toLowerCase()}.</em>
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-soft)] leading-relaxed max-w-[480px] mb-6">
              {guide.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="trust-chip">Clinician reviewed</span>
              <span className="trust-chip">Lab informed</span>
              <span className="trust-chip">Start low · go slow</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROTOCOL + AT-A-GLANCE */}
      <section className="px-4 sm:px-6 lg:px-14 pb-10 sm:pb-14 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 sm:gap-8 items-start">
          <article className="rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 bg-[var(--surface-muted)] border-l-4 border-[var(--leaf)]">
            <p className="eyebrow text-[var(--leaf)] mb-3">The protocol</p>
            <h2 className="font-display text-[24px] sm:text-[30px] font-normal tracking-tight text-[var(--ink)] mb-4">
              Start low. Go slow. <em className="font-accent not-italic text-[var(--leaf)]">Stay consistent.</em>
            </h2>
            <p className="text-[15px] sm:text-[16px] leading-relaxed text-[var(--text)]">
              {guide.protocol}
            </p>
          </article>

          <aside aria-label="Onset and duration" className="rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)]">
            <p className="eyebrow text-[var(--muted)] mb-4">At a glance</p>
            <dl className="space-y-4">
              <div>
                <dt className="text-[12px] tracking-[1.2px] uppercase font-semibold text-[var(--muted)] mb-1">Onset</dt>
                <dd className="font-display text-[18px] sm:text-[20px] tracking-tight text-[var(--ink)]">{guide.onset}</dd>
              </div>
              <div>
                <dt className="text-[12px] tracking-[1.2px] uppercase font-semibold text-[var(--muted)] mb-1">Duration</dt>
                <dd className="font-display text-[18px] sm:text-[20px] tracking-tight text-[var(--ink)]">{guide.duration}</dd>
              </div>
            </dl>
            <div className="mt-5 pt-5 border-t border-[var(--border)] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--peach)] flex items-center justify-center font-display text-xs font-medium text-[var(--ink)]">MC</div>
              <div>
                <div className="text-[12.5px] font-semibold text-[var(--ink)]">{guide.clinician}</div>
                <div className="text-[11px] text-[var(--muted)]">{guide.clinicianRole}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* TIPS */}
      <section className="px-4 sm:px-6 lg:px-14 pb-10 sm:pb-14 max-w-[1440px] mx-auto">
        <div className="max-w-[640px] mb-6 sm:mb-8">
          <p className="eyebrow text-[var(--muted)] mb-3">Practical tips</p>
          <h2 className="font-display text-[26px] sm:text-[36px] font-normal tracking-tight text-[var(--ink)] leading-tight">
            What clinicians tell their patients to <em className="font-accent not-italic text-[var(--leaf)]">actually do</em>.
          </h2>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lm-stagger">
          {guide.tips.map((tip, i) => (
            <li key={tip} className="rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] flex gap-4">
              <span
                aria-hidden="true"
                className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--leaf-soft)] text-[var(--leaf)] flex items-center justify-center font-display text-base font-medium"
              >
                {i + 1}
              </span>
              <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-[var(--text)]">{tip}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CONTRAINDICATIONS */}
      <section className="px-4 sm:px-6 lg:px-14 pb-10 sm:pb-14 max-w-[1440px] mx-auto">
        <div className="rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 lg:p-10 bg-[#FFF8E8] border border-[var(--border-strong)]">
          <div className="flex items-start gap-3 mb-4">
            <span aria-hidden="true" className="mt-0.5 w-7 h-7 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--highlight)] font-display text-base font-semibold">!</span>
            <div>
              <p className="eyebrow text-[var(--highlight)] mb-1">Talk to your clinician first if</p>
              <h2 className="font-display text-[20px] sm:text-[24px] font-normal tracking-tight text-[var(--ink)]">When to pause and ask</h2>
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-4">
            {guide.contraindications.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-[14px] sm:text-[14.5px] leading-snug text-[var(--text)]">
                <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--highlight)] flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LOG OUTCOME CTA */}
      <section className="px-4 sm:px-6 lg:px-14 pb-10 sm:pb-14 max-w-[1440px] mx-auto">
        <div
          className="rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-center"
          style={{ background: "var(--leaf-soft)" }}
        >
          <div>
            <p className="eyebrow mb-3" style={{ color: "var(--leaf)" }}>
              After a few uses
            </p>
            <h3 className="font-display text-[22px] sm:text-[32px] font-normal tracking-[-0.6px] sm:tracking-[-0.8px] leading-[1.15] sm:leading-[1.1] text-[var(--ink)] mb-2">
              How&rsquo;s it working for you?
            </h3>
            <p className="text-[14.5px] sm:text-[15px] text-[var(--text-soft)] max-w-[520px] leading-relaxed">
              30 seconds of feedback helps you spot patterns — and helps the next person on the shelf decide.
            </p>
          </div>
          <Link
            href="/leafmart/account/outcomes"
            className="inline-flex items-center justify-center rounded-full font-medium tracking-wide bg-[var(--leaf)] text-[var(--bg)] hover:bg-[var(--ink)] transition-colors whitespace-nowrap px-7 sm:px-8 py-4 text-[14.5px] sm:text-[15px] w-full lg:w-auto"
          >
            Log your outcome
          </Link>
        </div>
      </section>

      {/* RELATED */}
      <section className="px-4 sm:px-6 lg:px-14 pb-14 sm:pb-20 max-w-[1440px] mx-auto">
        <div className="flex items-baseline justify-between mb-5 sm:mb-6">
          <p className="eyebrow text-[var(--muted)]">Related products</p>
          <Link
            href="/leafmart/products"
            className="text-[13px] font-medium text-[var(--leaf)] hover:underline"
          >
            Browse all →
          </Link>
        </div>
        <div className="lm-stagger">
          <LeafmartProductGrid products={related} />
        </div>
      </section>
    </>
  );
}
