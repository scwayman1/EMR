// EMR-301 — Patient empowerment guide: "How to talk to your provider
// about cannabis." Public-facing education page; no auth required.
//
// Aim: give patients a script + tactics for raising cannabis with a
// provider who may be skeptical, dismissive, or carrying stigma. Lead
// with empathy, anchor in evidence, propose a trial-and-document plan,
// and de-escalate if the conversation goes sideways.

import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/ornament";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata: Metadata = {
  title: "How to talk to your provider about cannabis — Leafjourney",
  description:
    "A practical, judgment-free guide for raising medical cannabis with a provider who may be unfamiliar with — or skeptical of — its therapeutic use.",
};

const STEPS = [
  {
    n: "01",
    title: "Lead with the goal, not the substance.",
    body:
      "Start with what you're trying to fix: pain, sleep, anxiety, nausea, appetite, spasticity. Providers respond to symptom-driven conversations. Cannabis is one possible tool — frame it that way.",
    script:
      "I've been struggling with sleep for the last six months and it's affecting my work. I've tried melatonin and good sleep hygiene with limited results. I'd like to talk through my options, and I want to ask about cannabis as part of that conversation.",
  },
  {
    n: "02",
    title: "Bring data, not opinions.",
    body:
      "Most provider hesitation is about uncertainty, not ideology. Reduce uncertainty: print or pull up one or two peer-reviewed reviews relevant to your symptom (PubMed has them), and bring a log of what you've already tried.",
    script:
      "I brought a recent review on cannabinoids for [your condition]. I'm not asking you to endorse cannabis broadly — I'm asking what you think of this evidence for my situation specifically.",
  },
  {
    n: "03",
    title: "Ask, don't assume.",
    body:
      "Phrase the request as a question. This invites the provider into the decision rather than challenging their authority. Most providers will engage if they feel respected.",
    script:
      "What would it take for you to feel comfortable supporting a closely-monitored trial? What would you want to see, and what would make you stop?",
  },
  {
    n: "04",
    title: "Propose a trial-and-document plan.",
    body:
      "Offer to log doses, products, side effects, and outcomes for 30–60 days. Providers love structured data. Leafjourney's outcomes log can be exported to share at your next visit.",
    script:
      "If you're open to it, I'll log every dose and outcome for the next 30 days and bring the results to our next visit. If we don't see meaningful improvement, I'll stop.",
  },
  {
    n: "05",
    title: "If they say no, ask why — and listen.",
    body:
      "A no is not the end. Concrete objections (interactions, employment drug testing, controlled-substance contracts, pregnancy, history of psychosis) are worth addressing. Vague objections often soften when you ask follow-up questions.",
    script:
      "Help me understand the specific concern. Is it about a known interaction with my other medications? Is it employment-related? Is it about a specific side effect you've seen?",
  },
  {
    n: "06",
    title: "It's still your body and your decision.",
    body:
      "If a provider stays unwilling to engage, that's a signal to seek a second opinion or a clinician who specializes in cannabinoid medicine. Continuity of care matters — but so does informed consent and bodily autonomy.",
    script:
      "I respect your position. I'd like to get a second opinion from a clinician who works with cannabinoids. Can you make sure your notes capture this conversation so the next provider has full context?",
  },
];

const RED_FLAGS = [
  "You take warfarin, clobazam, or other narrow-therapeutic-index medications",
  "You're pregnant, breastfeeding, or trying to conceive",
  "You have a personal or family history of psychosis or schizophrenia",
  "You're a minor — most clinical guidance excludes patients under 18",
  "You have a controlled-substance agreement with a pain or addiction clinic",
  "You operate heavy machinery, drive professionally, or are subject to drug testing",
];

const RIGHTS = [
  "You have the right to a second opinion.",
  "You have the right to see your provider's notes (the 21st Century Cures Act).",
  "You have the right to ask for a written rationale when a treatment is denied.",
  "You have the right to take notes, record (where legally allowed), or bring a witness.",
  "You have the right to leave a practice and request your records be transferred.",
];

export default function TalkToYourProviderPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pt-12 pb-10">
        <Eyebrow className="mb-5 text-accent">Patient empowerment</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-text mb-6">
          How to talk to your provider about cannabis.
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted leading-relaxed max-w-3xl">
          You shouldn't have to argue your way into a treatment that might
          help you. This guide gives you the language, the evidence, and the
          posture to raise medical cannabis with a provider who may be
          unfamiliar with it — or quietly skeptical — without losing the
          relationship.
        </p>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pb-16">
        <ol className="space-y-8">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-3xl border border-border bg-surface p-7 md:p-9"
            >
              <div className="flex items-start gap-5">
                <div className="font-display text-3xl md:text-4xl text-accent shrink-0 leading-none mt-1">
                  {s.n}
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-xl md:text-2xl text-text tracking-tight mb-3">
                    {s.title}
                  </h2>
                  <p className="text-[15px] text-text-muted leading-relaxed mb-4">
                    {s.body}
                  </p>
                  <blockquote className="rounded-2xl bg-surface-muted border-l-4 border-accent px-5 py-4">
                    <p className="text-[10.5px] uppercase tracking-[0.16em] text-text-subtle font-semibold mb-2">
                      Script you can use
                    </p>
                    <p className="text-[15px] italic text-text leading-relaxed">
                      &ldquo;{s.script}&rdquo;
                    </p>
                  </blockquote>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-7">
            <Eyebrow className="mb-3 text-amber-700">Be upfront about</Eyebrow>
            <p className="text-[14px] text-text-muted mb-4 leading-relaxed">
              These factors meaningfully change the conversation. Naming them
              early earns trust and helps your provider give you a serious
              answer rather than a reflexive one.
            </p>
            <ul className="space-y-2">
              {RED_FLAGS.map((r) => (
                <li
                  key={r}
                  className="flex gap-2 text-[14px] text-text leading-relaxed"
                >
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-surface-raised p-7">
            <Eyebrow className="mb-3 text-accent">Your rights</Eyebrow>
            <p className="text-[14px] text-text-muted mb-4 leading-relaxed">
              The conversation is collaborative — but the decisions are yours.
            </p>
            <ul className="space-y-2">
              {RIGHTS.map((r) => (
                <li
                  key={r}
                  className="flex gap-2 text-[14px] text-text leading-relaxed"
                >
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pb-24">
        <div className="rounded-3xl bg-ink text-white p-10 md:p-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] mb-4">
              Need a clinician who actually engages?
            </h2>
            <p className="text-white/80 text-[15px] leading-relaxed">
              Leafjourney clinicians work with cannabis every day. If your
              current provider isn't the right fit for this conversation, we
              can be a second opinion — not a replacement.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link
              href="/leafmart/consult"
              className="inline-flex items-center gap-2 rounded-full bg-accent text-white font-medium px-6 py-3 hover:bg-accent-strong transition-colors"
            >
              Talk to a Leafjourney clinician →
            </Link>
            <Link
              href="/education"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white font-medium px-6 py-3 hover:bg-white/10 transition-colors"
            >
              Back to Education
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
