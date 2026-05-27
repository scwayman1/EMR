import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "How to talk to your provider about cannabis — Leafjourney",
  description:
    "A patient empowerment guide for raising medical cannabis with skeptical or stigma-laden providers. Scripts, evidence, and a one-page conversation primer you can print.",
  alternates: { canonical: `${SITE_URL}/education/talk-to-your-provider` },
  robots: { index: true, follow: true },
};

const STEPS: { title: string; body: string }[] = [
  {
    title: "Lead with your goal, not the substance",
    body: "Start with the outcome you want — better sleep, less pain, lower opioid use. Frame cannabis as one option you're researching, not a position you're defending.",
  },
  {
    title: "Acknowledge the stigma, then move past it",
    body: "Many providers were trained when cannabis was Schedule I and research was suppressed. A simple \"I know this can be a sensitive topic\" lowers the temperature and invites a real conversation.",
  },
  {
    title: "Bring evidence, not anecdotes",
    body: "Print or save 1–2 peer-reviewed studies relevant to your condition (PubMed is free). Leafjourney's research tab makes this easy. Hand them the citation, not a viral video.",
  },
  {
    title: "Ask about interactions, not permission",
    body: "Pivot from \"can I use cannabis?\" to \"how do we make sure cannabis won't interact with what I'm already taking?\" That reframes the conversation around safety, which every clinician is trained to engage on.",
  },
  {
    title: "Document the visit",
    body: "Ask the provider to note the conversation in your chart, even if they decline to recommend. A documented refusal is itself useful — it lets you seek a second opinion with continuity.",
  },
  {
    title: "Know your right to a second opinion",
    body: "If your provider won't engage at all, you are entitled to find one who will. Leafjourney's clinician network is one option. Our \"Talk to a provider\" tool can connect you in minutes.",
  },
];

const SCRIPTS: { situation: string; line: string }[] = [
  {
    situation: "Opening the conversation",
    line: "\"I've been researching whether medical cannabis might help with my sleep. Can we talk through what's known and whether it could fit my plan?\"",
  },
  {
    situation: "Provider seems uncomfortable",
    line: "\"I understand this isn't part of standard pharmacology training. I just want to make sure we're considering every safe option.\"",
  },
  {
    situation: "Provider says no without engaging",
    line: "\"Could you help me understand the specific concern? If it's interactions, I'd like to figure out together how to manage that.\"",
  },
  {
    situation: "Asking about referrals",
    line: "\"If this isn't something you recommend personally, can you refer me to a colleague who works with medical cannabis?\"",
  },
];

const ADVOCACY_LINKS: { label: string; href: string; blurb: string }[] = [
  {
    label: "Americans for Safe Access",
    href: "https://www.safeaccessnow.org",
    blurb: "Patient legal rights, state-by-state access, and provider directories.",
  },
  {
    label: "Society of Cannabis Clinicians",
    href: "https://www.cannabisclinicians.org",
    blurb: "Find a clinician trained in cannabis medicine.",
  },
  {
    label: "Patient Focused Certification",
    href: "https://patientfocusedcertification.org",
    blurb: "Independent product certification and patient education.",
  },
];

export default function TalkToYourProviderPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main className="max-w-[1100px] mx-auto px-6 lg:px-12 pt-12 pb-20">
        <Eyebrow className="mb-6">Patient empowerment</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-text max-w-3xl">
          How to talk to your provider about cannabis.
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-7 max-w-2xl leading-relaxed">
          You shouldn&apos;t have to choose between an honest doctor and one who
          will engage with cannabis as medicine. This guide is for patients who
          want to walk into a visit prepared, calm, and informed — even when the
          provider is skeptical.
        </p>

        <EditorialRule className="my-12" />

        <section aria-labelledby="six-steps">
          <h2
            id="six-steps"
            className="font-display text-2xl md:text-3xl tracking-tight text-text mb-8"
          >
            Six steps for a productive visit
          </h2>
          <ol className="space-y-5">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-5 bg-surface-raised rounded-2xl border border-border p-6 shadow-sm"
              >
                <span className="font-display text-[28px] leading-none text-accent/30 select-none shrink-0">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg text-text tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-muted mt-2 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <EditorialRule className="my-14" />

        <section aria-labelledby="scripts">
          <div className="flex items-center gap-3 mb-8">
            <LeafSprig size={24} className="text-accent" />
            <h2
              id="scripts"
              className="font-display text-2xl md:text-3xl tracking-tight text-text"
            >
              Scripts you can borrow
            </h2>
          </div>
          <p className="text-sm text-text-muted mb-6 max-w-2xl">
            These aren&apos;t scripts to memorize — they&apos;re sentence starters
            that survive a tense moment. Pick the one that fits where the
            conversation is, not where you wanted it to be.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCRIPTS.map((s) => (
              <div
                key={s.situation}
                className="bg-surface rounded-2xl border border-border p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-2">
                  {s.situation}
                </p>
                <p className="text-[15px] text-text leading-relaxed italic">
                  {s.line}
                </p>
              </div>
            ))}
          </div>
        </section>

        <EditorialRule className="my-14" />

        <section aria-labelledby="resources">
          <h2
            id="resources"
            className="font-display text-2xl md:text-3xl tracking-tight text-text mb-6"
          >
            If your provider still won&apos;t engage
          </h2>
          <p className="text-sm text-text-muted mb-6 max-w-2xl leading-relaxed">
            You have options. Cannabis-trained clinicians, patient advocacy
            organizations, and Leafjourney&apos;s own care network can pick up
            where a stigma-laden visit leaves off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADVOCACY_LINKS.map((r) => (
              <a
                key={r.label}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-surface-raised rounded-2xl border border-border p-5 hover:border-accent/40 transition-colors"
              >
                <p className="text-sm font-medium text-text">{r.label}</p>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  {r.blurb}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-accent mt-3">
                  Visit →
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14">
            <div className="relative max-w-2xl">
              <Eyebrow className="mb-4">Bring a friend</Eyebrow>
              <h2 className="font-display text-2xl md:text-3xl tracking-tight text-text leading-tight">
                Talk to a Leafjourney provider instead.
              </h2>
              <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
                Our clinicians are trained in cannabis medicine and will engage
                with your goals seriously. No stigma, no awkward pivots — just a
                real conversation about what might help.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/leafmart/consult">
                  <Button size="lg">Talk to a provider</Button>
                </Link>
                <Link href="/education">
                  <Button size="lg" variant="ghost">
                    More education
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
