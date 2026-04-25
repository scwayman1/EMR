import Link from "next/link";
import type { Metadata } from "next";
import { Portrait } from "@/components/leafmart/PortraitPlaceholder";

export const metadata: Metadata = {
  title: "Talk to a clinician",
  description:
    "Connect to the Leafjourney clinical desk for a private consultation. Licensed physicians, HIPAA-compliant, no pressure.",
};

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="trust-chip">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 6.2L5.2 7.8L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  );
}

const STEPS = [
  {
    n: "01",
    t: "Book a 20-minute call",
    b: "Pick a time that fits your week. Same-day slots are usually open.",
    bg: "var(--sage)",
    deep: "var(--leaf)",
  },
  {
    n: "02",
    t: "Talk to a real clinician",
    b: "A licensed physician on the Leafjourney medical desk reviews your goals, current routine, and any meds.",
    bg: "var(--peach)",
    deep: "#9E5621",
  },
  {
    n: "03",
    t: "Get a personal shelf",
    b: "Your clinician suggests products from Leafmart that fit your situation. You log outcomes; they tune over time.",
    bg: "var(--butter)",
    deep: "#8A6A1F",
  },
];

export default function ConsultPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-6 lg:px-14 pt-3 pb-12 max-w-[1440px] mx-auto">
        <div
          className="rounded-[36px] px-10 lg:px-16 py-14 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center relative overflow-hidden"
          style={{ background: "var(--sage)" }}
        >
          <div>
            <div className="inline-flex items-center gap-2 bg-white/65 px-3.5 py-2 rounded-full text-[12.5px] font-medium text-[var(--leaf)] mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
              Powered by the Leafjourney clinical network
            </div>

            <h1 className="font-display text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.0] font-normal tracking-[-1.8px] text-[var(--ink)] mb-5">
              Talk to a
              <br />
              <em className="font-accent not-italic text-[var(--leaf)]">clinician.</em>
            </h1>
            <p className="text-[18px] text-[var(--text-soft)] leading-relaxed max-w-[520px] mb-8">
              A short, private consultation with a licensed physician — to help
              you choose products that match your goals, not the loudest label.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link
                href="/portal/schedule"
                className="inline-flex items-center rounded-full font-medium tracking-wide bg-[var(--ink)] text-[#FFF8E8] hover:bg-[var(--leaf)] transition-colors"
                style={{ padding: "16px 28px", fontSize: 15 }}
              >
                Book a consultation
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center rounded-full font-medium border-[1.5px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[#FFF8E8] transition-colors"
                style={{ padding: "16px 28px", fontSize: 15 }}
              >
                How it works
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <TrustChip>Licensed physicians</TrustChip>
              <TrustChip>HIPAA-compliant</TrustChip>
              <TrustChip>Leafjourney network</TrustChip>
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <div className="w-full max-w-[360px] bg-white/40 rounded-[32px] p-3">
              <Portrait tone="sage" caption="Dr. Patel · Internal medicine" />
            </div>
          </div>
        </div>
      </section>

      {/* CONNECTION EXPLAINER */}
      <section id="how-it-works" className="px-6 lg:px-14 py-14 max-w-[1440px] mx-auto">
        <div className="max-w-[640px] mb-10">
          <p className="eyebrow text-[var(--muted)] mb-3">The Leafjourney connection</p>
          <h2 className="font-display text-[34px] sm:text-[44px] font-normal tracking-[-1.2px] leading-[1.05] text-[var(--ink)] mb-4">
            One thread from the
            <em className="font-accent not-italic text-[var(--leaf)]"> shelf to the chart.</em>
          </h2>
          <p className="text-[16px] text-[var(--text-soft)] leading-relaxed">
            Leafmart is the marketplace. Leafjourney is the clinical platform
            behind it. When you connect, your clinician sees the products
            you&rsquo;ve tried and the outcomes you&rsquo;ve logged — so the next
            recommendation is grounded in your actual experience, not a guess.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-[24px] p-7 flex flex-col gap-3"
              style={{ background: s.bg }}
            >
              <p className="font-mono text-[12px]" style={{ color: s.deep }}>
                {s.n}
              </p>
              <h3 className="font-display text-[22px] leading-tight text-[var(--ink)]">
                {s.t}
              </h3>
              <p className="text-[14px] text-[var(--text-soft)] leading-relaxed">
                {s.b}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECONDARY CTA */}
      <section className="px-6 lg:px-14 pb-20 max-w-[1440px] mx-auto">
        <div
          className="rounded-[28px] p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center"
          style={{ background: "var(--bg-deep)" }}
        >
          <div>
            <p className="eyebrow text-[var(--muted)] mb-3">Ready when you are</p>
            <h3 className="font-display text-[26px] sm:text-[32px] font-normal tracking-[-0.8px] leading-[1.1] text-[var(--ink)] mb-2">
              No pressure, no upsell — just a real conversation.
            </h3>
            <p className="text-[15px] text-[var(--text-soft)] max-w-[520px] leading-relaxed">
              First consultation is $0 with most plans. We&rsquo;ll tell you
              upfront if you&rsquo;d be better served somewhere else.
            </p>
          </div>
          <Link
            href="/portal/schedule"
            className="inline-flex items-center justify-center rounded-full font-medium tracking-wide bg-[var(--leaf)] text-[#FFF8E8] hover:bg-[var(--ink)] transition-colors whitespace-nowrap"
            style={{ padding: "16px 32px", fontSize: 15 }}
          >
            Book a consultation
          </Link>
        </div>
      </section>
    </>
  );
}
