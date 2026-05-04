// EMR-340 — C-suite roles, expectations, and qualifications.
//
// Scope per Dr. Patel: build out every C-suite role except CEO and CPTO
// (those two are filled). This page is a public-ish recruiting and
// transparency surface — it sets expectations for prospective leaders
// and lets the team explain "why we're hiring this seat" to candidates
// and partners. Content is editorial; refine with each hire.

import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/ornament";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata: Metadata = {
  title: "Leadership — Leafjourney",
  description:
    "The C-suite seats we're building out: responsibilities, expected outcomes, qualifications, and reporting lines.",
};

interface Role {
  slug: string;
  title: string;
  oneLiner: string;
  responsibilities: string[];
  outcomes: string[];
  qualifications: string[];
  reportsTo: string;
  status: "Filled" | "Open" | "Searching";
}

const ROLES: Role[] = [
  {
    slug: "cmo",
    title: "Chief Medical Officer (CMO)",
    oneLiner:
      "The clinical conscience of the company — owns every decision that touches a patient's outcome.",
    responsibilities: [
      "Set clinical guidelines and treatment protocols across the platform.",
      "Review and approve every product, surface, and AI agent that touches patient care.",
      "Own clinical-quality KPIs (outcome lift, adverse-event rate, time-to-relief).",
      "Represent Leafjourney to medical societies, payers, and the FDA.",
    ],
    outcomes: [
      "Quarterly outcome review published to the team and partners.",
      "Zero unreviewed clinical surfaces in production.",
      "Two peer-reviewed publications per year in cannabinoid medicine.",
    ],
    qualifications: [
      "MD or DO with active license in good standing.",
      "10+ years of clinical practice; cannabinoid medicine experience preferred.",
      "Track record of building or scaling a clinical program.",
      "Comfort with regulated software (HIPAA, 21 CFR Part 11) and AI-assisted care.",
    ],
    reportsTo: "CEO",
    status: "Open",
  },
  {
    slug: "cfo",
    title: "Chief Financial Officer (CFO)",
    oneLiner:
      "Designs the company's economics so we can keep care affordable while growing margin where it doesn't hurt patients.",
    responsibilities: [
      "Own forecasting, treasury, FP&A, and audit-ready financial controls.",
      "Lead capital strategy: equity, debt, and reimbursement-side revenue lines.",
      "Partner with CMO on payer contracts, value-based care pilots, and pricing.",
      "Own the unit economics dashboard the team uses daily.",
    ],
    outcomes: [
      "Clean SOC-2 / financial audit each year.",
      "Transparent margin model that holds up under board scrutiny.",
      "Cash runway visibility ≥18 months at all times.",
    ],
    qualifications: [
      "CPA, CFA, or equivalent.",
      "Healthcare or e-commerce CFO experience at $50M+ scale.",
      "Lived experience operating in a regulated revenue environment.",
    ],
    reportsTo: "CEO",
    status: "Searching",
  },
  {
    slug: "coo",
    title: "Chief Operating Officer (COO)",
    oneLiner:
      "Translates strategy into a calm, execution-ready operation. The person every team can rely on to remove friction.",
    responsibilities: [
      "Run the weekly operating cadence across clinical, product, and commerce.",
      "Own vendor, fulfillment, and inventory operations end-to-end.",
      "Lead the playbooks for state-by-state market entry.",
      "Partner with CTO on tooling that reduces operational toil.",
    ],
    outcomes: [
      "Consistent on-time fulfillment ≥98%.",
      "State-launch playbook reusable in <60 days per market.",
      "Operational NPS from internal teams ≥70.",
    ],
    qualifications: [
      "Operating leader at a regulated marketplace or specialty pharmacy.",
      "Multi-state operations experience.",
      "Comfort with both physical fulfillment and digital ops.",
    ],
    reportsTo: "CEO",
    status: "Open",
  },
  {
    slug: "cio",
    title: "Chief Information Officer (CIO)",
    oneLiner:
      "Owns the data, security, and integration spine — the part patients never see and can't live without.",
    responsibilities: [
      "Own information security, HIPAA compliance, and data governance.",
      "Run the integration program (EMRs, labs, payers, vendors).",
      "Partner with CTO on platform reliability, observability, and DR posture.",
      "Lead vendor risk assessments and BAAs.",
    ],
    outcomes: [
      "Annual SOC-2 Type II + HIPAA audit pass with no major findings.",
      "Mean time to detect a security event <15 minutes.",
      "Patient-data access auditable end-to-end.",
    ],
    qualifications: [
      "Experience leading information security in a healthcare or fintech setting.",
      "CISSP or equivalent preferred.",
      "Track record of building security programs that don't slow product down.",
    ],
    reportsTo: "CPTO",
    status: "Open",
  },
  {
    slug: "ccmo",
    title: "Chief Commerce Officer (CCMO)",
    oneLiner:
      "Owns the storefront, vendor relationships, and the patient-buying experience end-to-end.",
    responsibilities: [
      "Own Leafmart's catalog strategy, merchandising, and conversion KPIs.",
      "Negotiate vendor terms; build the standards every brand on the shelf must meet.",
      "Lead the commerce roadmap with product and clinical.",
      "Run the shop's brand voice and editorial standards.",
    ],
    outcomes: [
      "Catalog reaches breadth & trust parity with Amazon (per EMR-303).",
      "Vendor onboarding time <14 days from application to live SKU.",
      "Conversion lift quarter-over-quarter.",
    ],
    qualifications: [
      "Senior commerce or merchandising leader at a regulated marketplace.",
      "Track record building a curated catalog with trust signals.",
      "Strong narrative and brand instincts.",
    ],
    reportsTo: "CEO",
    status: "Open",
  },
  {
    slug: "chro",
    title: "Chief People Officer (CHRO)",
    oneLiner:
      "Builds the team and the culture. Protects what makes Leafjourney feel different to work at.",
    responsibilities: [
      "Lead recruiting, total rewards, performance, and people operations.",
      "Codify and protect the culture as the team scales.",
      "Own DEI, learning & development, and leadership coaching.",
      "Partner with COO on multi-state employment compliance.",
    ],
    outcomes: [
      "Time-to-hire for engineering and clinical roles <45 days.",
      "Voluntary attrition <10% annually.",
      "Internal eNPS ≥60.",
    ],
    qualifications: [
      "CHRO or VP People at a high-growth, regulated company.",
      "Multi-state and remote-team experience.",
      "Comfort with both early-stage hands-on and scale-up systems work.",
    ],
    reportsTo: "CEO",
    status: "Open",
  },
  {
    slug: "ccoo",
    title: "Chief Compliance Officer (CCOO)",
    oneLiner:
      "Keeps us inside the lines so the team can run fast inside them. Patient-facing risk owner.",
    responsibilities: [
      "Own regulatory strategy across HIPAA, state cannabis laws, FDA, and DEA scope.",
      "Run the compliance review for every new feature, market, and product class.",
      "Lead the policies, training, and incident-response programs.",
      "Be the single accountable owner for breach notification and audit response.",
    ],
    outcomes: [
      "Zero material compliance findings in any audit.",
      "Compliance review never blocks a release for more than 48 hours.",
      "All-team annual compliance training completion ≥95%.",
    ],
    qualifications: [
      "JD or equivalent regulatory certification (CHC, CIPP).",
      "Healthcare or cannabis compliance experience.",
      "Pragmatic — protects the patient and the company without becoming a bottleneck.",
    ],
    reportsTo: "CEO",
    status: "Open",
  },
  {
    slug: "cso",
    title: "Chief Science Officer (CSO)",
    oneLiner:
      "Turns Leafjourney's outcome data and clinical evidence into a defensible scientific position.",
    responsibilities: [
      "Lead our research agenda: cohort studies, real-world evidence, peer-reviewed publication.",
      "Partner with CMO on protocol design and clinical advisory boards.",
      "Own relationships with academic medical centers and research foundations.",
      "Steward the data-quality contract with engineering and clinical ops.",
    ],
    outcomes: [
      "Two peer-reviewed publications per year sourced from Leafjourney data.",
      "Active research partnerships with at least three academic medical centers.",
      "Data-quality dashboard that the engineering team uses daily.",
    ],
    qualifications: [
      "PhD, MD/PhD, or equivalent in pharmacology, biostatistics, or clinical research.",
      "Track record of publishing in high-impact journals.",
      "Comfort working at the interface of engineering, clinical, and academia.",
    ],
    reportsTo: "CMO",
    status: "Open",
  },
];

const STATUS_TONE: Record<Role["status"], string> = {
  Filled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Open: "bg-amber-100 text-amber-800 border-amber-200",
  Searching: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function LeadershipPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-12 pb-12">
        <Eyebrow className="mb-5 text-accent">Leadership</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-text mb-6">
          The seats we're building out.
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted leading-relaxed max-w-3xl">
          Below: each C-suite seat we're filling, what we expect of the person
          in it, what they'll be measured on, and where they sit on the org.
          CEO and CPTO are filled (Dr. Neal H. Patel and Scott Wayman) — see{" "}
          <Link href="/about" className="text-accent underline">
            About
          </Link>
          . The rest is what we're still hiring.
        </p>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ROLES.map((r) => (
            <article
              key={r.slug}
              id={r.slug}
              className="rounded-3xl border border-border bg-surface p-7 md:p-9 scroll-mt-24"
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight leading-tight">
                  {r.title}
                </h2>
                <span
                  className={`text-[10.5px] uppercase tracking-[0.16em] font-semibold border rounded-full px-3 py-1 ${STATUS_TONE[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
              <p className="text-[15px] text-text-muted leading-relaxed mb-5">
                {r.oneLiner}
              </p>

              <Section title="Responsibilities" items={r.responsibilities} />
              <Section title="Expected outcomes" items={r.outcomes} />
              <Section title="Qualifications" items={r.qualifications} />

              <p className="text-[12.5px] text-text-subtle mt-5">
                Reports to <strong className="text-text">{r.reportsTo}</strong>
              </p>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-4">
      <p className="text-[10.5px] uppercase tracking-[0.16em] text-text-subtle font-semibold mb-2">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li
            key={s}
            className="flex gap-2 text-[14px] text-text leading-relaxed"
          >
            <span className="mt-2 w-1 h-1 rounded-full bg-accent shrink-0" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
