import Link from "next/link";
import { Mail, UserPlus } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Leadership — Leafjourney",
  description:
    "Meet the Leafjourney C-suite — the executives building the first EMR designed for cannabis medicine, and the seats we're still hiring for.",
};

// EMR-170 — C-Suite About Page skeleton. A structured leadership roster:
// filled seats carry a short bio + links; open seats are explicit calls to
// join. Designed to fill in as the team grows.

interface ExecSeat {
  role: string;
  acronym: string;
  name?: string;
  bio?: string;
  mandate: string;
  linkedin?: string;
  email?: string;
}

const C_SUITE: ExecSeat[] = [
  {
    role: "Chief Executive Officer",
    acronym: "CEO",
    name: "Dr. Neal H. Patel, D.O.",
    bio: "Practicing physician and cannabis-medicine pioneer. Sets clinical vision and company direction.",
    mandate: "Vision, clinical strategy, fundraising.",
    email: "neal@leafjourney.com",
  },
  {
    role: "Chief Product & Technology Officer",
    acronym: "CPTO",
    name: "Scott Wayman",
    bio: "Builds the platform, the agent harness, and the marketplace. Owns engineering and product.",
    mandate: "Product, engineering, and the AI agent fleet.",
    email: "scott@leafjourney.com",
  },
  { role: "Chief Medical Officer", acronym: "CMO", mandate: "Clinical safety, evidence, and provider trust." },
  { role: "Chief Financial Officer", acronym: "CFO", mandate: "Revenue cycle, unit economics, and the funding roadmap." },
  { role: "Chief Operating Officer", acronym: "COO", mandate: "Go-live operations, support, and scaling the practice fleet." },
  { role: "Chief Commercial Officer", acronym: "CCO", mandate: "Sales, partnerships, and the marketplace distributor network." },
  { role: "Chief Compliance Officer", acronym: "CCO-Reg", mandate: "Multi-state cannabis compliance, HIPAA, and audit readiness." },
  { role: "Chief Marketing Officer", acronym: "CMO-Mktg", mandate: "Brand, demand generation, and the ChatCB education engine." },
];

function Avatar({ seat }: { seat: ExecSeat }) {
  const initials = seat.name
    ? seat.name
        .replace(/Dr\.|D\.O\.|,/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
    : seat.acronym.slice(0, 2);
  return (
    <span
      className="grid h-14 w-14 place-items-center rounded-2xl font-display text-lg font-medium text-white"
      style={{ background: "linear-gradient(150deg, var(--accent), var(--accent-strong, var(--accent)))" }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export default function LeadershipPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main id="main-content">
        <section className="mx-auto max-w-[1280px] px-6 pb-12 pt-12 text-center lg:px-12">
          <Eyebrow className="mb-5 justify-center">Leadership</Eyebrow>
          <h1 className="mx-auto max-w-3xl font-display text-4xl leading-[1.05] tracking-tight text-text md:text-5xl">
            The team building cannabis medicine&apos;s <span className="text-accent">operating system</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-text-muted">
            A founder-led team with the clinical and technical depth to do this right — and a clear set
            of seats we&apos;re hiring for as we scale.
          </p>
        </section>

        <section className="mx-auto max-w-[1280px] px-6 pb-16 lg:px-12">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {C_SUITE.map((seat) => {
              const filled = Boolean(seat.name);
              return (
                <div
                  key={seat.acronym}
                  className="flex flex-col rounded-2xl border border-border bg-surface-raised p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Avatar seat={seat} />
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">{seat.role}</p>
                      {filled ? (
                        <p className="font-display text-lg tracking-tight text-text">{seat.name}</p>
                      ) : (
                        <Badge tone="highlight">Open seat</Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-text-muted">
                    {filled ? seat.bio : seat.mandate}
                  </p>
                  {filled && (
                    <p className="mt-2 text-[12.5px] text-text-subtle">
                      <span className="font-medium text-text-muted">Mandate:</span> {seat.mandate}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2 pt-4">
                    {filled ? (
                      <>
                        {seat.email && (
                          <a href={`mailto:${seat.email}`}>
                            <Button size="sm" variant="secondary" leadingIcon={<Mail width={14} height={14} />}>
                              Email
                            </Button>
                          </a>
                        )}
                      </>
                    ) : (
                      <Link href="/contact">
                        <Button size="sm" variant="secondary" leadingIcon={<UserPlus width={14} height={14} />}>
                          Join as {seat.acronym}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <EditorialRule className="mx-auto max-w-[1280px] px-6 lg:px-12" />

        <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-raised p-7">
              <Eyebrow className="mb-3">Mission</Eyebrow>
              <p className="text-[16px] leading-relaxed text-text">
                Give every cannabis-medicine practice the EMR, the marketplace, and the AI it deserves —
                so clinicians can focus on patients, not paperwork.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-7">
              <Eyebrow className="mb-3">Vision</Eyebrow>
              <p className="text-[16px] leading-relaxed text-text">
                The system of record for the cannabis care economy — where outcomes data, research, and
                commerce live in one trusted place.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-6 pb-24 lg:px-12">
          <div className="rounded-3xl border border-border bg-surface-raised p-10 text-center md:p-14">
            <Eyebrow className="mb-4 justify-center">Join us</Eyebrow>
            <h2 className="font-display text-3xl tracking-tight text-text md:text-4xl">
              We&apos;re hiring across the C-suite
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-text-muted">
              If you want to build the operating system for a new category of medicine, we should talk.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/contact">
                <Button size="lg">Get in touch</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="ghost">
                  About Leafjourney
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
