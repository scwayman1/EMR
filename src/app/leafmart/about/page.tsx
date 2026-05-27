import Link from "next/link";
import type { Metadata } from "next";
import { TRUST_STEPS } from "@/components/leafmart/demo-data";

export const metadata: Metadata = {
  title: "The Method",
  description: "How Leafmart vets every product: physician curation, lab verification, and outcome data from the Leafjourney care platform.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-14 pt-12 sm:pt-16 pb-10 sm:pb-12 max-w-[1440px] mx-auto lm-fade-in">
        <p className="eyebrow text-[var(--leaf)] mb-3">About Leafmart</p>
        <h1 className="font-display text-[36px] sm:text-[52px] lg:text-[64px] font-normal tracking-[-1.4px] sm:tracking-[-2px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)] max-w-4xl">
          A cannabis store with the <em className="font-accent not-italic text-[var(--leaf)]">rigor of a medical platform</em> behind it.
        </h1>
        <p className="mt-5 sm:mt-6 text-[15.5px] sm:text-[18px] text-[var(--text-soft)] max-w-[640px] leading-relaxed">
          Leafmart is the marketplace arm of Leafjourney Health. We don&apos;t manufacture products. We don&apos;t take paid placement. We curate a short shelf of things our clinical team would actually recommend — and then we let the outcomes speak.
        </p>
      </section>

      {/* The Method */}
      <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto">
        <h2 className="font-display text-[28px] sm:text-[36px] font-normal tracking-tight text-[var(--ink)] mb-6 sm:mb-8">The Method</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lm-stagger">
          {TRUST_STEPS.map((s) => (
            <div key={s.n} className="rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 min-h-[220px] sm:min-h-[280px] flex flex-col" style={{ background: s.bg }}>
              <div className="flex items-center gap-3 sm:gap-3.5 mb-4 sm:mb-5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/70 flex items-center justify-center font-display text-base sm:text-lg font-medium" style={{ color: s.deep }}>{s.n}</div>
                <h3 className="font-display text-[20px] sm:text-[24px] font-medium tracking-tight text-[var(--ink)]">{s.t}</h3>
              </div>
              <p className="text-[14px] sm:text-[15px] leading-relaxed text-[var(--text-soft)]">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Clinician note */}
      <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto">
        <div className="rounded-2xl bg-[var(--surface-muted)] p-7 sm:p-10 lg:p-14 border-l-4 border-[var(--leaf)]">
          <p className="eyebrow text-[var(--leaf)] mb-3 sm:mb-4">A note from our care team</p>
          <blockquote className="font-display text-[22px] sm:text-[28px] lg:text-[36px] leading-[1.2] sm:leading-[1.15] tracking-tight text-[var(--text)] max-w-3xl">
            &ldquo;A good cannabis store doesn&apos;t sell you what&apos;s popular — it sells you what&apos;s <em className="text-[var(--leaf)]">right</em>. Every product on Leafmart is here because one of us would reach for it in clinic.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3 mt-5 sm:mt-6">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--peach)] flex items-center justify-center font-display text-sm font-medium text-[var(--ink)]">NP</div>
            <div>
              <div className="text-sm font-semibold">Dr. N.H. Patel, DO</div>
              <div className="text-xs text-[var(--muted)]">Medical Lead · Leafjourney Health</div>
            </div>
          </div>
        </div>
      </section>

      {/* From Leafjourney */}
      <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 pb-14 sm:pb-20 max-w-[1440px] mx-auto">
        <div className="rounded-[28px] sm:rounded-[36px] p-7 sm:p-10 lg:p-14" style={{ background: "linear-gradient(180deg, #FFFCF7 0%, #F6EFE0 100%)" }}>
          <p className="eyebrow text-[var(--leaf)] mb-3">From Leafjourney Health</p>
          <h2 className="font-display text-[28px] sm:text-[36px] font-normal tracking-tight text-[var(--ink)] mb-5 sm:mb-6">Built on an actual healthcare brand.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 text-[14.5px] sm:text-[15px] text-[var(--text-soft)] leading-relaxed">
            <p>Leafmart isn&apos;t a startup selling supplements with influencer endorsements. It&apos;s a curated shelf operated by the same team that runs the Leafjourney EMR — a physician-led cannabis care platform used in clinical practice.</p>
            <p>That means the same clinicians who write treatment plans for patients are also the ones reviewing products for this shelf. The standards are the same. The rigor is the same. The difference is that Leafmart is open to anyone, not just patients in our network.</p>
          </div>
          <div className="mt-6 sm:mt-8">
            <Link
              href="/leafmart/shop"
              className="inline-flex items-center justify-center rounded-full font-medium bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)] transition-colors px-6 py-3.5 sm:py-3 text-[14.5px] sm:text-[15px] w-full sm:w-auto"
            >
              Browse the shelf →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
