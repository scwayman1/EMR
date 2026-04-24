import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Leafmart FAQ",
  description:
    "Answers to common questions about Leafmart — lab testing, clinician review, shipping, age verification, returns, and privacy.",
};

interface FaqItem {
  id: string;
  q: string;
  a: React.ReactNode;
}

const SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: "Product + clinical review",
    items: [
      {
        id: "lab-testing",
        q: "How do you verify lab testing?",
        a: (
          <>
            Every Leafmart product has a third-party Certificate of Analysis
            (COA) on file — typically an ISO 17025 accredited lab. COAs
            cover cannabinoid content, terpene profile, and contaminant
            screening (pesticides, heavy metals, microbial, solvents). We
            refuse listings without a current COA. You can click through to
            the COA on every PDP that has one.
          </>
        ),
      },
      {
        id: "clinician-review",
        q: "What does 'physician curated' mean exactly?",
        a: (
          <>
            Every brand + product combination is reviewed by a practicing
            clinician on our care team before it&apos;s listed. The clinician
            looks at the cannabinoid profile, the lab result, the brand&apos;s
            consistency record, and (when available) outcome signals from
            patients who have used it. If the clinician wouldn&apos;t
            recommend it in an encounter, it doesn&apos;t make the shelf.
          </>
        ),
      },
      {
        id: "ranking",
        q: "How are products ranked in search + recommendations?",
        a: (
          <>
            A combination of clinician-pick status, in-stock + rating,
            structure/function match against your goals, and — when data
            exists — a per-product efficacy signal from de-identified
            outcome data. We do not sell sponsored placements. Brands cannot
            pay to move up.
          </>
        ),
      },
    ],
  },
  {
    title: "Shipping + age",
    items: [
      {
        id: "shipping",
        q: "Where do you ship?",
        a: (
          <>
            Hemp-derived products (≤ 0.3% delta-9 THC) ship to most states —
            a handful have zero-THC or smokable-flower restrictions that our
            checkout enforces automatically. Licensed-cannabis products (over
            the hemp threshold) ship intrastate only. Every cart-to-state
            combination is validated before checkout confirms.
          </>
        ),
      },
      {
        id: "age-verification",
        q: "Do I need to verify my age?",
        a: (
          <>
            Any product containing more than 0.3% delta-9 THC requires 21+
            age verification. We check date of birth on file (from your
            patient chart, if you have one) or prompt you at first
            interaction. Once verified, we don&apos;t re-prompt per product
            or per session.
          </>
        ),
      },
      {
        id: "partner-fulfillment",
        q: "Who actually ships the product?",
        a: (
          <>
            The brand. Leafmart is a marketplace — each vendor fulfills
            their own orders under their own license. We route orders to the
            right vendor, handle payment, and surface tracking numbers once
            they&apos;re uploaded. Multi-vendor orders may arrive in
            separate packages.
          </>
        ),
      },
    ],
  },
  {
    title: "Payments + returns",
    items: [
      {
        id: "payments",
        q: "How do payments work?",
        a: (
          <>
            Payabli-backed processing. Credit / debit + ACH supported. Your
            card is charged on order confirmation. We hold funds briefly
            before disbursing to vendors — if there&apos;s a dispute, it
            resolves before money moves.
          </>
        ),
      },
      {
        id: "returns",
        q: "Can I return a product?",
        a: (
          <>
            Within 30 days, yes — we&apos;re the customer-service first
            line, not the vendor. Reach out through your order page or
            email support@leafjourney.com. We review vendor-fault vs
            buyer-remorse cases and issue partial or full refunds via the
            original payment method. Opened consumables may be partial-refund
            only, depending on the product type.
          </>
        ),
      },
      {
        id: "disputes",
        q: "What if something's wrong and the vendor isn't responding?",
        a: (
          <>
            Open a dispute on your order page. We step in. Leafmart is on
            the hook to resolve — not you chasing a brand.
          </>
        ),
      },
    ],
  },
  {
    title: "Privacy",
    items: [
      {
        id: "privacy",
        q: "What happens to my health data?",
        a: (
          <>
            Your chart is your chart. If you sign in to Leafmart with your
            Leafjourney patient account, we use your outcome data to tailor
            recommendations — but that data never leaves our platform and is
            never shared with vendors. Vendors see aggregate, de-identified,
            cohort-level signal only (and only with consent).
          </>
        ),
      },
      {
        id: "tracking",
        q: "Do you sell my browsing data?",
        a: (
          <>
            No. We don&apos;t run third-party ad pixels on Leafmart.
            Analytics stays first-party. Your email never goes to a mailing
            broker.
          </>
        ),
      },
      {
        id: "account",
        q: "How do I delete my account?",
        a: (
          <>
            Email support@leafjourney.com with &ldquo;Delete my
            account.&rdquo; We comply within 30 days (faster where state law
            requires). Clinical records have retention requirements but can
            be isolated and anonymized on request.
          </>
        ),
      },
    ],
  },
];

export default function LeafmartFaqPage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 pt-16 pb-8">
        <div className="flex items-center gap-2 text-xs text-text-subtle mb-8">
          <Link href="/leafmart" className="hover:text-text transition-colors">
            Leafmart
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">FAQ</span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 mb-6">
          <LeafSprig size={14} className="text-accent" />
          <span className="text-[11px] uppercase tracking-wider text-text-muted">
            Frequently asked
          </span>
        </div>

        <h1 className="font-display text-[42px] sm:text-5xl md:text-[60px] leading-[1.02] tracking-tight text-text max-w-2xl">
          The short list of{" "}
          <span className="text-accent italic">what people ask</span>.
        </h1>
        <p className="mt-6 text-lg text-text-muted max-w-2xl leading-relaxed">
          If something&apos;s missing, email{" "}
          <a
            href="mailto:support@leafjourney.com"
            className="underline hover:text-text transition-colors"
          >
            support@leafjourney.com
          </a>{" "}
          and we&apos;ll add it.
        </p>
      </section>

      {/* ── Jump-to table of contents ──────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-6">
        <div className="rounded-lg border border-border bg-surface-muted/50 p-5">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-3">
            Jump to
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.flatMap((s) => s.items).map((item) => (
              <Link
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted hover:text-text transition-colors"
              >
                {item.q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sections ───────────────────────────────────────── */}
      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="max-w-[1080px] mx-auto px-6 lg:px-12 py-10"
        >
          <h2 className="text-xl font-semibold tracking-tight text-text mb-6">
            {section.title}
          </h2>
          <div className="space-y-8">
            {section.items.map((item) => (
              <article
                key={item.id}
                id={item.id}
                className="scroll-mt-24 border-l-2 border-accent/40 pl-5"
              >
                <h3 className="text-base font-semibold text-text mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-16 text-center">
        <h2 className="font-display text-3xl tracking-tight text-text mb-3">
          Still curious?
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Good questions make the FAQ better. Reach out.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="mailto:support@leafjourney.com">
            <Button size="lg" variant="primary">
              Email support
            </Button>
          </a>
          <Link href="/leafmart/products">
            <Button size="lg" variant="secondary">
              Browse products
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
