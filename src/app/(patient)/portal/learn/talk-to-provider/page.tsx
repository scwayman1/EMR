// EMR-301 — "Talking to your provider about cannabis"
//
// Patient empowerment guide. Five sections: before the visit, reading the
// provider, in the conversation, after the visit, and model dialogues.
// Pure content; deep-linked from the Learn tab and printable via the
// browser print dialog (the `print:` Tailwind utilities collapse chrome).

import Link from "next/link";
import { PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { LeafSprig, Eyebrow, EditorialRule } from "@/components/ui/ornament";

export const metadata = {
  title: "Talking to your provider about cannabis",
  description:
    "A patient empowerment guide for cannabis conversations with providers who may be skeptical or unfamiliar.",
};

interface DialogueLine {
  speaker: "you" | "provider";
  text: string;
}

interface Script {
  scenario: string;
  lines: DialogueLine[];
  takeaway: string;
}

const SCRIPTS: Script[] = [
  {
    scenario: "Bringing cannabis up for the first time",
    lines: [
      {
        speaker: "you",
        text: "I've been managing chronic pain for two years. The current regimen isn't getting me below a 6 out of 10. I'd like to discuss adding medical cannabis as part of the plan — I've been researching it through my care portal.",
      },
      {
        speaker: "provider",
        text: "We don't usually recommend that here.",
      },
      {
        speaker: "you",
        text: "I understand it isn't part of your standard formulary. Would you be open to looking at the evidence with me? I have a one-page summary of the cannabinoid profile I'm considering. If it's not the right fit for your practice, I'd appreciate a referral to a clinician who handles this.",
      },
    ],
    takeaway:
      "Lead with symptom and goals, not the substance. Acknowledge their position. Ask for evidence review or a referral — both are reasonable asks.",
  },
  {
    scenario: "Pushback that suggests stigma",
    lines: [
      {
        speaker: "provider",
        text: "Have you tried gabapentin? I think we should exhaust the formulary first.",
      },
      {
        speaker: "you",
        text: "I tried gabapentin for 8 weeks last year. I documented the side effects and limited efficacy in my chart. I'm not asking to skip standard care — I'm asking to layer in cannabis given what I've already failed.",
      },
      {
        speaker: "provider",
        text: "Why cannabis specifically?",
      },
      {
        speaker: "you",
        text: "Two reasons: the cannabinoid profile I'm considering (CBD-dominant, low THC) has emerging evidence for my condition, and I want a non-opioid option that I have agency over. I'm not seeking euphoria. I'm seeking function.",
      },
    ],
    takeaway:
      "Tie cannabis to what's already on your chart. Name the cannabinoid profile, not the strain. Make it clear you've thought about why this and not something else.",
  },
  {
    scenario: "If you feel labeled as drug-seeking",
    lines: [
      {
        speaker: "you",
        text: "I want to name something I'm sensing — I feel like I'm being read as drug-seeking, and I'd like to clear that up. I'm bringing this conversation forward because nothing else has worked, not because I'm pursuing a particular substance. If we can't agree on a path, I'd like the conversation documented and a referral to someone who handles cannabis cases.",
      },
    ],
    takeaway:
      "Name it directly, calmly. Ask for documentation. The fact that you brought it up in a measured way is itself evidence you are not drug-seeking — and it lands in the chart that way.",
  },
];

const BEFORE_THE_VISIT = [
  {
    title: "Frame the visit around the symptom",
    detail:
      "On intake forms or when the medical assistant asks, write the reason for visit as 'managing chronic pain' or 'sleep disruption' — not 'medical cannabis consultation'. Cannabis enters the conversation as one option, not as the headline.",
  },
  {
    title: "Bring your evidence",
    detail:
      "Pull your symptom log, current regimens, what you've already tried (and the outcomes), and any Leafjourney outcome data. A printed one-pager is hard to dismiss; a verbal claim is easy to brush past.",
  },
  {
    title: "Know your state's medical cannabis law",
    detail:
      "Knowing whether your state has a registry, what conditions qualify, and what your provider is legally allowed to recommend means you can spot when 'I can't' really means 'I won't'.",
  },
  {
    title: "Check your provider's stance",
    detail:
      "Their bio, a quick search, or the front-desk staff can tell you whether your provider has worked with cannabis patients before. If you suspect they haven't, plan to invest more time in the evidence framing.",
  },
];

const READING_THE_PROVIDER: { stance: string; cues: string[]; move: string }[] = [
  {
    stance: "Open",
    cues: [
      "Asks open-ended questions about your goals",
      "Mentions cannabis-naive vs cannabis-experienced patients without judgement",
      "Knows the difference between THC and CBD without prompting",
    ],
    move:
      "Move the conversation forward. Bring out your evidence one-pager and the cannabinoid profile you're considering. Ask for a treatment plan, not a permission slip.",
  },
  {
    stance: "Neutral / curious",
    cues: [
      "Asks 'what does the research say?' or 'have you talked to anyone else about this?'",
      "Doesn't have a strong opinion but isn't shutting down",
      "May not feel personally qualified",
    ],
    move:
      "Offer to walk them through the evidence calmly. Suggest ChatCB or a specific study. If they're not the right person, ask them to refer you to a colleague who handles cannabis cases.",
  },
  {
    stance: "Opposed",
    cues: [
      "Calls cannabis 'recreational' regardless of how you frame it",
      "Conflates medical cannabis with addiction without your history supporting that",
      "Refuses to discuss it without alternatives on the table",
    ],
    move:
      "Don't escalate. Ask one clarifying question: 'Are you comfortable discussing cannabis as part of my care?' If the answer is no, ask for a written note in the chart, request a referral, and start your second-opinion process.",
  },
];

const AFTER_THE_VISIT = [
  "Write down what was said, what was decided, and any rationale your provider gave — same day if possible.",
  "Request a copy of the chart note that reflects what was discussed. You're entitled to it under HIPAA.",
  "If the relationship isn't a fit, you can change providers. Cannabis-friendly clinician directories include the Society of Cannabis Clinicians, NORML, and your state's medical cannabis registry.",
  "Loop your care team in via the patient portal — if a new clinician picks up your case, they should see the trail.",
];

function Script({ s, index }: { s: Script; index: number }) {
  return (
    <Card tone="raised">
      <CardContent className="py-6 px-5 md:px-6">
        <p className="eyebrow text-[var(--leaf,#3a7d44)] mb-2">Scenario {index + 1}</p>
        <h3 className="font-display text-xl text-text tracking-tight mb-4">{s.scenario}</h3>
        <ul className="space-y-3 mb-4">
          {s.lines.map((line, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 text-[14.5px] leading-relaxed border ${
                line.speaker === "you"
                  ? "bg-[var(--accent-soft)]/40 border-[var(--accent)]/15"
                  : "bg-surface-muted/60 border-border/60"
              }`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-1">
                {line.speaker === "you" ? "You" : "Provider"}
              </span>
              <span className="text-text">{line.text}</span>
            </li>
          ))}
        </ul>
        <div className="pl-4 border-l-2 border-[var(--accent)]/30">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-1">Takeaway</p>
          <p className="text-sm text-text-muted">{s.takeaway}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TalkToProviderPage() {
  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="chatLearn" />

      <div className="mb-8 print:mb-4">
        <Eyebrow className="mb-3">Patient empowerment</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
          Talking to your provider about cannabis
        </h1>
        <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-2xl">
          A practical guide for patients walking into appointments where cannabis
          may be met with skepticism, stigma, or unfamiliarity. The point isn&apos;t
          to win the conversation — it&apos;s to walk out with a plan and a
          documented record.
        </p>
      </div>

      <Card tone="ambient" className="mb-8 p-6 md:p-8 print:hidden">
        <div className="flex items-start gap-4">
          <LeafSprig size={28} className="text-accent shrink-0 mt-1" />
          <div>
            <p className="eyebrow text-[var(--leaf,#3a7d44)] mb-2">Use it before your next visit</p>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              Print this page or skim the model dialogues below. Bring a one-page
              summary of your symptoms, what you&apos;ve tried, and the cannabinoid
              profile you&apos;re considering — clinicians take written evidence more
              seriously than verbal claims.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/portal/learn?tab=cannabinoids"
                className="text-[var(--leaf,#3a7d44)] hover:underline font-medium"
              >
                Review cannabinoids →
              </Link>
              <Link
                href="/portal/education"
                className="text-[var(--leaf,#3a7d44)] hover:underline font-medium"
              >
                Open your care guide →
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="text-[var(--leaf,#3a7d44)] hover:underline font-medium"
              >
                Print this guide
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 1 — Before the visit */}
      <section className="mb-10" aria-labelledby="before-the-visit">
        <h2 id="before-the-visit" className="font-display text-2xl text-text tracking-tight mb-1">
          1 · Before the visit
        </h2>
        <p className="text-sm text-text-muted mb-4">
          The conversation is half-won before you walk in. These four moves set the table.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BEFORE_THE_VISIT.map((b) => (
            <Card key={b.title} tone="raised">
              <CardContent className="py-5 px-5">
                <h3 className="font-medium text-text mb-1">{b.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{b.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <EditorialRule className="my-8" />

      {/* 2 — Reading the provider */}
      <section className="mb-10" aria-labelledby="reading-the-provider">
        <h2 id="reading-the-provider" className="font-display text-2xl text-text tracking-tight mb-1">
          2 · Reading the provider
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Within the first few minutes you can usually tell whether the provider is open,
          neutral, or opposed. Each has a different next move.
        </p>
        <div className="space-y-3">
          {READING_THE_PROVIDER.map((r) => (
            <Card key={r.stance} tone="raised">
              <CardContent className="py-5 px-5">
                <p className="eyebrow text-[var(--leaf,#3a7d44)] mb-2">{r.stance}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-1">
                  Cues
                </p>
                <ul className="list-disc list-inside text-sm text-text-muted mb-3 space-y-0.5">
                  {r.cues.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-1">
                  Your move
                </p>
                <p className="text-sm text-text">{r.move}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <EditorialRule className="my-8" />

      {/* 3 — In the conversation (model dialogues) */}
      <section className="mb-10" aria-labelledby="in-the-conversation">
        <h2 id="in-the-conversation" className="font-display text-2xl text-text tracking-tight mb-1">
          3 · In the conversation
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Three scripts for three common moments. Read them aloud once. You don&apos;t need
          to memorize them — you just need the muscle memory of staying calm and
          symptom-focused under pressure.
        </p>
        <div className="space-y-4">
          {SCRIPTS.map((s, i) => (
            <Script key={s.scenario} s={s} index={i} />
          ))}
        </div>
      </section>

      <EditorialRule className="my-8" />

      {/* 4 — After the visit */}
      <section className="mb-10" aria-labelledby="after-the-visit">
        <h2 id="after-the-visit" className="font-display text-2xl text-text tracking-tight mb-1">
          4 · After the visit
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Whether the conversation went well or badly, the next 24 hours matter.
        </p>
        <ol className="space-y-2.5 list-decimal list-inside text-[14.5px] leading-relaxed text-text-muted">
          {AFTER_THE_VISIT.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <EditorialRule className="my-8" />

      {/* 5 — You are not alone */}
      <section className="mb-10" aria-labelledby="you-are-not-alone">
        <h2 id="you-are-not-alone" className="font-display text-2xl text-text tracking-tight mb-1">
          5 · You are not alone
        </h2>
        <p className="text-[14.5px] text-text-muted leading-relaxed mb-3">
          Many patients have walked into appointments expecting to be heard and walked
          out feeling judged. Some succeed on the first try; some need a second opinion;
          some find that the right clinician for them was three appointments away. None
          of that is failure — it&apos;s the cost of advocating for yourself in a system
          that hasn&apos;t fully caught up to the science.
        </p>
        <p className="text-[14.5px] text-text-muted leading-relaxed">
          If you walk out of a visit with documentation and a clearer next step, the
          conversation worked — even if it didn&apos;t end with the prescription you
          wanted today.
        </p>
      </section>

      <div className="mt-12 mb-4 text-center print:hidden">
        <p className="text-xs text-text-subtle max-w-md mx-auto leading-relaxed">
          This guide is educational. It isn&apos;t a substitute for clinical judgment.
          Always discuss specific cannabis use with a qualified clinician familiar with
          your history.
        </p>
        <LeafSprig size={28} className="text-accent/40 mx-auto mt-6" />
      </div>
    </PageShell>
  );
}
