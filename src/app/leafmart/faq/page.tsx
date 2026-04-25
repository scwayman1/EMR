"use client";

import { useEffect, useRef, useState } from "react";

const FAQ_ITEMS = [
  { q: "What is Leafmart?", a: "Leafmart is a clinician-curated cannabis wellness marketplace operated by Leafjourney Health. Every product is reviewed by a licensed physician, verified by a third-party lab, and ranked by real patient outcomes from the Leafjourney care platform." },
  { q: "Who reviews the products?", a: "Products are reviewed by the Leafjourney clinical team — licensed physicians who also write treatment plans for patients in our cannabis care platform. The standards are the same ones they apply in clinical practice." },
  { q: "What does 'lab verified' mean?", a: "Every product on Leafmart has a current Certificate of Analysis (COA) from a third-party testing lab. This covers potency, terpene profiles, residual solvents, pesticides, and heavy metals. If we can't verify the lab work, we don't list the product.", id: "lab-testing" },
  { q: "How does clinician review work?", a: "Our medical team reviews the formulation, ingredients, delivery format, and dosing for every product before it reaches the shelf. They also write clinician notes that appear on each product page, summarizing their review.", id: "clinician-review" },
  { q: "What does 'outcome informed' mean?", a: "Rankings on Leafmart are influenced by de-identified patient outcomes from the Leafjourney care platform. When patients report improvement from a specific product type, that signal helps shape what we recommend." },
  { q: "Do you ship nationally?", a: "Hemp-derived products (those containing less than 0.3% THC by dry weight) ship nationally where permitted by state law. Licensed cannabis products are available intrastate only, subject to your state's regulations.", id: "shipping" },
  { q: "What's your return policy?", a: "Unopened products can be returned within 30 days of delivery. Due to the nature of consumable products, opened items cannot be returned but may be eligible for store credit if there's a quality concern.", id: "returns" },
  { q: "Do I need to be 21+?", a: "Age requirements depend on the product and your state's regulations. Hemp-derived CBD products may be available to those 18+, while THC-containing products require you to be 21+ in all jurisdictions.", id: "age" },
  { q: "How do I contact support?", a: "Email us at support@leafmart.com or use the contact form in your account. We typically respond within one business day.", id: "contact" },
  { q: "What states do you operate in?", a: "Hemp-derived products ship to all 50 states where permitted. Licensed cannabis products are currently available in states where Leafjourney Health operates clinical programs. Check our state availability page for the latest.", id: "states" },
];

function FAQItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState(0);

  // Measure content height for smooth max-height transition
  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setMaxH(contentRef.current.scrollHeight);
    } else {
      setMaxH(0);
    }
  }, [open]);

  return (
    <div id={item.id} className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`faq-${item.q.replace(/\s+/g, "-").toLowerCase()}`}
        className="w-full flex items-center justify-between py-5 sm:py-6 text-left group gap-4"
      >
        <h3 className="font-display text-[17px] sm:text-[20px] font-normal tracking-tight text-[var(--ink)] group-hover:text-[var(--leaf)] transition-colors">
          {item.q}
        </h3>
        <span
          aria-hidden="true"
          className="text-[var(--muted)] text-2xl flex-shrink-0 leading-none transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
        >
          +
        </span>
      </button>
      <div
        id={`faq-${item.q.replace(/\s+/g, "-").toLowerCase()}`}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open ? maxH : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="pb-5 sm:pb-6 text-[14.5px] sm:text-[15px] text-[var(--text-soft)] leading-relaxed max-w-[720px] pr-4">
          {item.a}
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <>
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
        {FAQ_ITEMS.map((item) => (
          <FAQItem key={item.q} item={item} />
        ))}
      </section>
    </>
  );
}
