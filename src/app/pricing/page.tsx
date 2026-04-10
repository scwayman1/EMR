import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";

export const metadata = {
  title: "Pricing — Green Path Health",
  description:
    "Flexible, modular pricing for cannabis care practices of every size.",
};

const TIERS = [
  {
    name: "Seedling",
    price: "$299",
    period: "/mo",
    description: "For solo practitioners getting started with cannabis care.",
    features: [
      "1 provider seat",
      "Up to 100 active patients",
      "AI scribe & note drafting",
      "Cannabis prescribing module",
      "Drug interaction checker",
      "Patient portal & messaging",
      "Outcome tracking",
      "HIPAA-compliant infrastructure",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$799",
    period: "/mo",
    description:
      "For growing practices that need the full clinical + operational suite.",
    features: [
      "Up to 5 provider seats",
      "Unlimited patients",
      "Everything in Seedling, plus:",
      "Research corpus & evidence engine",
      "AI billing & CPT/ICD-10 coding",
      "Practice operations dashboard",
      "Mission control analytics",
      "Lifestyle care plan module",
      "My Story patient ebooks",
      "Multi-language support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Canopy",
    price: "Custom",
    period: "",
    description:
      "For health systems, multi-location groups, and enterprise partners.",
    features: [
      "Unlimited provider seats",
      "Unlimited patients",
      "Everything in Growth, plus:",
      "White-label & custom branding",
      "EMR integration (HL7 FHIR)",
      "Dedicated AI model tuning",
      "Clinical trial matching",
      "Insurance eligibility engine",
      "API access & module licensing",
      "Dedicated success manager",
      "Custom SLA & data sovereignty",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const ADD_ONS = [
  {
    name: "Dispensary Integration",
    price: "$149/mo",
    description: "SKU scanning, geolocation, and product recommendations.",
  },
  {
    name: "Telehealth Suite",
    price: "$99/mo",
    description:
      "HIPAA-compliant video visits, phone calls, and AI transcription.",
  },
  {
    name: "SMS Reminders",
    price: "$49/mo",
    description: "Automated 7-day, 2-day, and 1-day appointment reminders.",
  },
  {
    name: "MIPS Reporting",
    price: "$199/mo",
    description:
      "AI-powered MIPS data extrapolation and CMS compliance reporting.",
  },
];

export default function PricingPage() {
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
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-12 pb-16 text-center">
        <Eyebrow className="mb-6 justify-center">Pricing</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-text max-w-3xl mx-auto">
          Modular pricing for <span className="text-accent">every practice</span>
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-6 max-w-xl mx-auto leading-relaxed">
          Start with what you need today. Add modules as you grow. No hidden
          fees, no long-term contracts.
        </p>
      </section>

      {/* Tiers */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`relative rounded-2xl border p-8 shadow-sm ${
                tier.highlighted
                  ? "border-accent bg-gradient-to-b from-surface-raised to-accent/[0.03] shadow-md ring-1 ring-accent/20"
                  : "border-border bg-surface-raised"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-accent text-accent-ink text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                    <LeafSprig size={12} className="text-accent-ink/80" />
                    Most popular
                  </span>
                </div>
              )}
              <h3 className="font-display text-2xl text-text tracking-tight">
                {tier.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl text-text tracking-tight">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-text-muted">{tier.period}</span>
                )}
              </div>
              <p className="text-sm text-text-muted mt-3 leading-relaxed">
                {tier.description}
              </p>

              <div className="mt-6">
                <Link href="/signup">
                  <Button
                    size="lg"
                    variant={tier.highlighted ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-text-muted"
                  >
                    <LeafSprig size={14} className="text-accent/60 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Add-ons */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-14">
          <Eyebrow className="mb-4">Add-on modules</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Expand your platform as you need it.
          </h2>
          <p className="text-text-muted mt-3 text-[15px] leading-relaxed">
            Every module integrates seamlessly with your existing Green Path
            setup. Add or remove anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ADD_ONS.map((addon) => (
            <div
              key={addon.name}
              className="flex items-start gap-5 bg-surface-raised rounded-2xl border border-border p-7 shadow-sm card-hover"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <LeafSprig size={20} className="text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg text-text tracking-tight">
                    {addon.name}
                  </h3>
                  <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    {addon.price}
                  </span>
                </div>
                <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                  {addon.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-2xl mx-auto text-center">
            <Eyebrow className="mb-4 justify-center">Ready to start?</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
              14-day free trial. No credit card required.
            </h2>
            <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
              Set up your practice in minutes. We&apos;ll guide you through
              everything.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link href="/signup">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="ghost">
                  Learn about us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              &copy; {new Date().getFullYear()} Green Path Health. A
              demonstration product — not a substitute for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
