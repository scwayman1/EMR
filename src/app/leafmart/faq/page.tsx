import type { Metadata } from "next";
import { FAQ_ITEMS } from "./faq-items";
import { FAQList } from "./FAQClient";
import { JsonLd } from "@/components/leafmart/JsonLd";
import { absoluteUrl, breadcrumbList, faqLd } from "@/lib/leafmart/seo";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about Leafmart, our products, and how we vet them.",
  alternates: { canonical: absoluteUrl("/leafmart/faq") },
};

export default function FAQPage() {
  const breadcrumbs = breadcrumbList([
    { name: "Leafmart", url: "/leafmart" },
    { name: "FAQ", url: "/leafmart/faq" },
  ]);
  const faq = faqLd(FAQ_ITEMS.map(({ q, a }) => ({ q, a })));

  return (
    <>
      <JsonLd data={[faq, breadcrumbs]} />
      <section className="px-4 sm:px-6 lg:px-14 pt-12 sm:pt-16 pb-6 sm:pb-8 max-w-[1440px] mx-auto lm-fade-in">
        <p className="eyebrow text-[var(--leaf)] mb-3">FAQ</p>
        <h1 className="font-display text-[36px] sm:text-[52px] lg:text-[64px] font-normal tracking-[-1.4px] sm:tracking-[-2px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)]">
          Common questions.
        </h1>
        <p className="mt-4 text-[15.5px] sm:text-[17px] text-[var(--text-soft)] max-w-[520px] leading-relaxed">
          Everything you need to know about Leafmart, our products, and how we vet them.
        </p>
      </section>

      <section className="px-4 sm:px-6 lg:px-14 py-6 sm:py-8 pb-14 sm:pb-20 max-w-[800px] mx-auto">
        <FAQList items={FAQ_ITEMS} />
      </section>
    </>
  );
}
