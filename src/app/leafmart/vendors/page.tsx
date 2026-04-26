import type { Metadata } from "next";
import { VendorApplicationForm } from "@/components/leafmart/VendorApplicationForm";

export const metadata: Metadata = {
  title: "Sell on Leafmart",
  description: "Partner with Leafmart — a clinician-curated cannabis wellness marketplace with a flat 10% take rate.",
};

const REQUIREMENTS = [
  { title: "Third-party lab testing", desc: "Current Certificate of Analysis (COA) for every SKU — potency, terpenes, residuals, heavy metals." },
  { title: "Formulation review", desc: "Our clinical team reviews ingredients, delivery format, and dosing against the product's intended use case." },
  { title: "Clean labeling", desc: "Accurate labels with clear dosing instructions. No health claims beyond what evidence supports." },
  { title: "Regulatory compliance", desc: "Products must comply with applicable state and federal regulations. We handle the legal review." },
];

export default function VendorsPage() {
  return (
    <>
      <section className="px-4 sm:px-6 lg:px-14 pt-12 sm:pt-16 pb-6 sm:pb-8 max-w-[1440px] mx-auto lm-fade-in">
        <p className="eyebrow text-[var(--leaf)] mb-3">For brands</p>
        <h1 className="font-display text-[36px] sm:text-[52px] lg:text-[64px] font-normal tracking-[-1.4px] sm:tracking-[-2px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)] max-w-3xl">
          Sell on <em className="font-accent not-italic text-[var(--leaf)]">Leafmart</em>.
        </h1>
        <p className="mt-5 sm:mt-6 text-[15.5px] sm:text-[18px] text-[var(--text-soft)] max-w-[600px] leading-relaxed">
          We&apos;re building a short, curated shelf — not an open marketplace. If your product is lab-verified and formulated with care, we want to hear from you.
        </p>
      </section>

      {/* Founding partner rate */}
      <section className="px-4 sm:px-6 lg:px-14 py-6 sm:py-8 max-w-[1440px] mx-auto">
        <div className="rounded-[24px] sm:rounded-[28px] p-7 sm:p-10 lg:p-14" style={{ background: "var(--sage)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-10 items-center">
            <div>
              <p className="eyebrow text-[var(--leaf)] mb-3">Founding partner rate</p>
              <h2 className="font-display text-[36px] sm:text-[44px] lg:text-[48px] font-normal tracking-[-1.0px] sm:tracking-[-1.2px] leading-[1.05] text-[var(--ink)]">
                10% flat.
              </h2>
              <p className="mt-4 text-[15px] sm:text-[17px] text-[var(--text-soft)] leading-relaxed">
                Locked for 24 months. No placement fees. No shelf slotting. No minimum ad spend. You make the product. We curate, verify, and present it to people who need it.
              </p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[
                { label: "Take rate", value: "10%" },
                { label: "Lock period", value: "24 months" },
                { label: "Placement fees", value: "$0" },
                { label: "Ad requirements", value: "None" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2.5 sm:py-3 border-b border-white/40">
                  <span className="text-[14px] sm:text-[15px] text-[var(--text-soft)]">{item.label}</span>
                  <span className="font-display text-lg sm:text-xl font-medium text-[var(--ink)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto">
        <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)] mb-6 sm:mb-8">What we look for</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lm-stagger">
          {REQUIREMENTS.map((r, i) => (
            <div key={r.title} className="rounded-2xl border border-[var(--border)] p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[var(--leaf-soft)] flex items-center justify-center font-display text-sm font-medium text-[var(--leaf)]">
                  0{i + 1}
                </div>
                <h3 className="font-display text-[17px] sm:text-lg font-medium tracking-tight text-[var(--ink)]">{r.title}</h3>
              </div>
              <p className="text-[14px] sm:text-sm text-[var(--text-soft)] leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section id="apply" className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 pb-14 sm:pb-20 max-w-[1440px] mx-auto">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <p className="eyebrow text-[var(--leaf)] mb-3">Ready to apply?</p>
            <h2 className="font-display text-[28px] sm:text-[40px] lg:text-[44px] font-normal tracking-[-1.0px] sm:tracking-[-1.2px] leading-[1.05] text-[var(--ink)] mb-4">
              Tell us about your <em className="font-accent not-italic text-[var(--leaf)]">brand</em>.
            </h2>
            <p className="text-[14.5px] sm:text-[16px] text-[var(--text-soft)] max-w-[520px] mx-auto leading-relaxed">
              Send us your product line, current COA, and a note about why you make what you make.
            </p>
          </div>
          <VendorApplicationForm />
        </div>
      </section>
    </>
  );
}
