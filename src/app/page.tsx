import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { AmbientMusicPlayer } from "@/components/ui/ambient-music";
import { LiveConsole } from "@/components/marketing/live-console";
import { Reveal } from "@/components/marketing/reveal";

// Public marketing / acquisition home page.
// Editorial, warm, botanical — with a live agent console to sell the core value prop.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Global ambient wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 85% 5%, var(--highlight-soft), transparent 65%)," +
            "radial-gradient(ellipse 50% 60% at 5% 85%, var(--accent-soft), transparent 60%)",
        }}
      />

      {/* ── Top nav ─────────────────────────────────────── */}
      <nav className="relative z-10 max-w-[1320px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/about"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            About
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/security"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors hidden md:inline-block"
          >
            Security
          </Link>
          <Link
            href="/store"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors hidden md:inline-block"
          >
            Store
          </Link>
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Request a demo</Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative max-w-[1320px] mx-auto px-6 lg:px-12 pt-16 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <Eyebrow className="mb-6">
              AI-native cannabis care platform
            </Eyebrow>
            <h1 className="font-display text-[42px] sm:text-5xl md:text-6xl lg:text-[68px] leading-[0.98] tracking-tight text-text">
              The EMR that{" "}
              <span className="text-accent italic">thinks</span>
              <br />
              with you.
            </h1>
            <p className="text-[17px] md:text-lg text-text-muted mt-7 max-w-xl leading-relaxed">
              A fleet of 13 AI agents reviews the chart, drafts the note, checks
              for drug interactions, and surfaces the research — so clinicians
              can spend their time on what actually matters: <strong className="text-text">the patient in front of them</strong>.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg">Request a demo</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="secondary">
                  See our story
                </Button>
              </Link>
            </div>

            {/* Quiet trust row */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <p className="font-display text-2xl text-accent">13</p>
                <p className="text-[11px] text-text-subtle uppercase tracking-wider">AI agents</p>
              </div>
              <div>
                <p className="font-display text-2xl text-accent">50+</p>
                <p className="text-[11px] text-text-subtle uppercase tracking-wider">Studies indexed</p>
              </div>
              <div>
                <p className="font-display text-2xl text-accent">43</p>
                <p className="text-[11px] text-text-subtle uppercase tracking-wider">Interactions</p>
              </div>
              <div>
                <p className="font-display text-2xl text-accent">HIPAA</p>
                <p className="text-[11px] text-text-subtle uppercase tracking-wider">Ready</p>
              </div>
            </div>
          </div>

          {/* Right: live console */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <LiveConsole />
          </div>
        </div>
      </section>

      <EditorialRule className="max-w-[1320px] mx-auto px-6 lg:px-12" />

      {/* ── The pain point ────────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-28">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <Eyebrow className="mb-5 justify-center">The problem we couldn&apos;t ignore</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl text-text tracking-tight leading-[1.05]">
              Physicians spend{" "}
              <span className="text-accent italic">2 hours</span> on their EMR
              <br className="hidden md:block" /> for every <span className="text-accent italic">1 hour</span> with a patient.
            </h2>
            <p className="text-[17px] text-text-muted mt-8 max-w-2xl mx-auto leading-relaxed">
              Chart review before visits. Documentation after. Billing codes.
              Refill requests. Message triage. The tools that were supposed to
              save time became the biggest thief of it.
            </p>
            <p className="font-display text-2xl md:text-3xl text-accent mt-10 italic">
              We built the EMR that gives that time back.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── Workflow showcase ──────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-20">
        <Reveal>
          <div className="max-w-3xl mb-16">
            <Eyebrow className="mb-5">The new physician workflow</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl text-text tracking-tight leading-[1.08]">
              From <span className="text-text-subtle line-through">25 minutes</span>{" "}
              to <span className="text-accent">3 minutes</span>.
            </h2>
            <p className="text-[17px] text-text-muted mt-5 leading-relaxed">
              One click, four steps. The entire pre-visit and documentation
              workflow, re-imagined around AI agents that actually do the work.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {WORKFLOW_STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
              <div className="relative h-full bg-surface-raised rounded-2xl border border-border p-7 shadow-sm card-hover">
                <div className="flex items-center gap-2 mb-5">
                  <span className="font-display text-[11px] font-medium text-accent uppercase tracking-[0.18em]">
                    Step {i + 1}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-text-subtle tabular-nums">
                    {step.time}
                  </span>
                </div>
                <div className="text-3xl mb-4">{step.icon}</div>
                <h3 className="font-display text-xl text-text tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-text-muted mt-3 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1320px] mx-auto px-6 lg:px-12" />

      {/* ── Meet the fleet ─────────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-28">
        <Reveal>
          <div className="max-w-3xl mb-16">
            <Eyebrow className="mb-5">Meet the fleet</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl text-text tracking-tight leading-[1.08]">
              Thirteen agents, <span className="text-accent italic">one platform</span>.
            </h2>
            <p className="text-[17px] text-text-muted mt-5 leading-relaxed">
              Every workflow in Leafjourney is backed by a specialized AI agent —
              not a single chatbot, but a fleet of experts working together,
              with humans always in the loop.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map((agent, i) => (
            <Reveal key={agent.name} delay={i * 40}>
              <div
                className={`group relative rounded-2xl border p-6 transition-all h-full ${
                  agent.featured
                    ? "bg-gradient-to-br from-accent/[0.08] via-surface-raised to-transparent border-accent/30 shadow-md"
                    : "bg-surface-raised border-border hover:border-border-strong"
                }`}
              >
                {agent.featured && (
                  <span className="absolute top-4 right-4 text-[9px] font-semibold uppercase tracking-wider bg-accent text-accent-ink px-2 py-0.5 rounded-full">
                    Flagship
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{agent.icon}</span>
                  <span className="font-mono text-[11px] text-text-subtle">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-display text-lg text-text tracking-tight">
                  {agent.name}
                </h3>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  {agent.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1320px] mx-auto px-6 lg:px-12" />

      {/* ── Three audiences ────────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-28">
        <Reveal>
          <div className="max-w-3xl mb-16">
            <Eyebrow className="mb-5">Built for three people</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl text-text tracking-tight leading-[1.08]">
              Clinician. Patient. Operator.
            </h2>
            <p className="text-[17px] text-text-muted mt-5 leading-relaxed">
              Every role in a practice has different needs. We built three
              purpose-designed experiences that share one data model — so the
              story stays whole.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AUDIENCES.map((audience, i) => (
            <Reveal key={audience.label} delay={i * 120}>
              <div className="relative bg-surface-raised rounded-3xl border border-border p-8 lg:p-10 shadow-sm card-hover overflow-hidden h-full">
                {/* Decorative gradient */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 60% 50% at 100% 0%, ${audience.glow}, transparent 70%)`,
                  }}
                />
                <div className="relative">
                  <div className="text-4xl mb-5">{audience.icon}</div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                    For {audience.label}
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl text-text tracking-tight leading-tight mt-2">
                    {audience.headline}
                  </h3>
                  <p className="text-sm text-text-muted mt-4 leading-relaxed">
                    {audience.body}
                  </p>
                  <ul className="mt-6 space-y-2">
                    {audience.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-xs text-text-muted"
                      >
                        <LeafSprig
                          size={12}
                          className="text-accent/60 mt-0.5 shrink-0"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Cannabis-specific ──────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-28">
        <Reveal>
          <div className="max-w-3xl mb-16">
            <Eyebrow className="mb-5">Cannabis, done right</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl text-text tracking-tight leading-[1.08]">
              The only EMR designed for{" "}
              <span className="text-accent italic">cannabis medicine</span> from day one.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CANNABIS_FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <div className="flex items-start gap-5 bg-surface-raised rounded-2xl border border-border p-7 shadow-sm h-full">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-xl">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg text-text tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-muted mt-2 leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1320px] mx-auto px-6 lg:px-12" />

      {/* ── Founder quote ──────────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-28">
        <Reveal>
          <div className="relative max-w-4xl mx-auto text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-20 -inset-y-10 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 50% 50% at 50% 50%, var(--accent-soft), transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-3 mb-8">
                <span className="h-px w-10 bg-accent/40" />
                <LeafSprig size={20} className="text-accent" />
                <span className="h-px w-10 bg-accent/40" />
              </div>
              <blockquote className="font-display text-2xl md:text-3xl lg:text-4xl text-text leading-[1.2] tracking-tight italic">
                &ldquo;This isn&apos;t MyChart. This is MyStory.
                <br />
                This isn&apos;t a patient&apos;s medical history.
                <br />
                This is a patient&apos;s medical journey.&rdquo;
              </blockquote>
              <div className="mt-10 flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent-strong flex items-center justify-center text-white font-display text-sm shadow-md">
                  NP
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text">
                    Dr. Neal H. Patel
                  </p>
                  <p className="text-xs text-text-subtle">
                    Co-Founder &amp; CEO
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <EditorialRule className="max-w-[1320px] mx-auto px-6 lg:px-12" />

      {/* ── Cannabis Plant 101 — a sacred tribute ──────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.05] via-surface-raised to-highlight/[0.04] p-10 md:p-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 50% 70% at 90% 10%, var(--accent-soft), transparent 70%)," +
                  "radial-gradient(ellipse 30% 50% at 10% 90%, var(--highlight-soft), transparent 70%)",
              }}
            />
            <div className="relative max-w-3xl mx-auto text-center">
              <Eyebrow className="mb-6 justify-center">The sacred plant</Eyebrow>
              <p className="font-display text-lg md:text-xl text-text leading-relaxed tracking-tight">
                For thousands of years, the cannabis plant has been a companion
                to humanity — a healer, a teacher, and a quiet source of relief
                for those in pain. Its roots reach deep into the soil of ancient
                medicine, its leaves hold compounds that speak directly to the
                human body through the endocannabinoid system. Cannabis is not a
                trend. It is a sacred botanical ally with the power to ease
                suffering, restore balance, and open pathways to wellness that
                modern medicine is only beginning to understand. All who use
                this platform shall respect the plant and use it with
                intention, care, and reverence for its remarkable healing
                properties.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Closing CTA ────────────────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pb-28 pt-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-raised via-surface-raised to-accent/[0.04] p-10 md:p-20 ambient">
            <div className="relative max-w-3xl">
              <Eyebrow className="mb-5">Give time back to care</Eyebrow>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-text tracking-tight leading-[1.05]">
                Your patients are waiting.
                <br />
                <span className="text-accent italic">So are we.</span>
              </h2>
              <p className="text-[17px] text-text-muted mt-7 leading-relaxed max-w-2xl">
                Leafjourney is in active development with partner
                practices. If you&apos;re a clinician, an investor, or a
                patient who believes healthcare deserves better — we&apos;d love
                to talk.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button size="lg">Request a demo</Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="secondary">
                    Meet the team
                  </Button>
                </Link>
              </div>
              <p className="font-display text-center text-lg md:text-xl text-accent tracking-tight italic mt-12">
                &ldquo;Personalized cannabis care, powered by heart and soul.&rdquo;
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Ambient music player */}
      <AmbientMusicPlayer />

      <footer className="border-t border-border">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-12 py-10 flex flex-col gap-6">
          <p className="text-xs italic text-text-muted leading-relaxed max-w-2xl">
            Cannabis should be considered a medicine so please use it carefully
            and judiciously. Do not abuse Cannabis and please respect the plant
            and its healing properties.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Wordmark size="sm" />
              <div className="hidden md:flex items-center gap-5 text-xs text-text-subtle">
                <Link href="/about" className="hover:text-text transition-colors">About</Link>
                <Link href="/pricing" className="hover:text-text transition-colors">Pricing</Link>
                <Link href="/security" className="hover:text-text transition-colors">Security</Link>
                <Link href="/store" className="hover:text-text transition-colors">Store</Link>
              </div>
            </div>
            <p className="text-xs text-text-subtle">
              &copy; {new Date().getFullYear()} Leafjourney. A demonstration product —
              not a substitute for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const WORKFLOW_STEPS = [
  {
    icon: "🧠",
    title: "Prepare",
    description:
      "AI agent pulls the chart, analyzes trends, surfaces risks — 2.3 seconds.",
    time: "~30s",
  },
  {
    icon: "▶️",
    title: "Start visit",
    description:
      "One click. Briefing flows into the scribe. Note is pre-seeded with talking points.",
    time: "~1 click",
  },
  {
    icon: "✍️",
    title: "Refine",
    description:
      "Inline AI editor per section: expand, clarify, add dosing, make it more clinical.",
    time: "~1 min",
  },
  {
    icon: "✅",
    title: "Sign",
    description:
      "Coding agent suggests ICD-10 + E&M. Physician signs. Done.",
    time: "~1 click",
  },
];

const AGENTS = [
  {
    icon: "🧠",
    name: "Pre-Visit Intelligence",
    description: "Synthesizes chart data, trends, and research into a briefing before every visit.",
    featured: true,
  },
  {
    icon: "✍️",
    name: "Scribe",
    description: "Drafts structured APSO visit notes from encounter context, pre-seeded by the briefing.",
    featured: true,
  },
  {
    icon: "🩺",
    name: "Coding Readiness",
    description: "Generates ICD-10 codes, E&M levels, and cannabis-specific coding suggestions.",
  },
  {
    icon: "📚",
    name: "Research Synthesizer",
    description: "Searches 50+ peer-reviewed studies, returns evidence at the point of care.",
  },
  {
    icon: "💊",
    name: "Dosing Recommender",
    description: "Suggests cannabinoid ratios and starting doses based on the research corpus.",
  },
  {
    icon: "📄",
    name: "Document Organizer",
    description: "Classifies, tags, and files uploaded documents into the right chart section.",
  },
  {
    icon: "📊",
    name: "Outcome Tracker",
    description: "Detects trends in patient check-ins and flags worsening scores for physician review.",
  },
  {
    icon: "💬",
    name: "Messaging Assistant",
    description: "Drafts personalized patient replies — always approval-gated by the clinician.",
  },
  {
    icon: "📞",
    name: "Patient Outreach",
    description: "Generates follow-up messages after encounters with context from the visit.",
  },
  {
    icon: "🔔",
    name: "Physician Nudge",
    description: "Creates follow-up tasks and reminders based on note content and patient state.",
  },
  {
    icon: "📅",
    name: "Scheduling",
    description: "Auto-creates reminder workflows 7, 2, and 1 day before upcoming appointments.",
  },
  {
    icon: "🏥",
    name: "Practice Launch",
    description: "Guides operators through the practice setup checklist with AI validation.",
  },
  {
    icon: "📋",
    name: "Intake",
    description: "Structures patient intake answers into actionable chart data and follow-up tasks.",
  },
];

const AUDIENCES = [
  {
    icon: "🩺",
    label: "clinicians",
    glow: "var(--accent-soft)",
    headline: "Stop charting. Start caring.",
    body:
      "Mission Control dashboard. AI scribe. Pre-visit briefings. Inline note refinement. Built so you actually look forward to opening your EMR.",
    features: [
      "Pre-Visit Intelligence Agent",
      "AI scribe with inline refinement",
      "Cannabis Combo Wheel (pharmacology tool)",
      "Research Console (50+ studies)",
      "Drug interaction checker (43 interactions)",
      "Physician-to-physician secure messaging",
    ],
  },
  {
    icon: "🌱",
    label: "patients",
    glow: "var(--highlight-soft)",
    headline: "Your medical story, kept close.",
    body:
      "Not a patient portal. A patient journey. My Story ebook, My Garden companion, lifestyle care plan, outcome tracking — warm, human, yours.",
    features: [
      "My Story printable ebook",
      "My Garden plant companion",
      "Lifestyle care plan (7 domains)",
      "Outcome check-ins with trends",
      "Secure messaging with your team",
      "Plain-language explanations",
    ],
  },
  {
    icon: "📈",
    label: "operators",
    glow: "var(--info-soft, var(--accent-soft))",
    headline: "A practice that runs itself.",
    body:
      "Mission control analytics, practice launch checklist, patient roster, insurance eligibility, billing worksheets. The ops layer that closes the loop.",
    features: [
      "Mission Control dashboard",
      "Patient roster & analytics",
      "Insurance eligibility checker",
      "Medicare CBD framework",
      "Billing & CPT/ICD-10 worksheets",
      "Practice launch checklist",
    ],
  },
];

const CANNABIS_FEATURES = [
  {
    icon: "⚕️",
    title: "Milligram-based dosing",
    body:
      "Every prescription tracks exact mg of THC and CBD per dose, per day. Volume can change, but therapeutic dose stays consistent — so patients never guess.",
  },
  {
    icon: "🔬",
    title: "Cannabis Combo Wheel",
    body:
      "Interactive pharmacology tool. Select cannabinoids and terpenes, see combined therapeutic profile, target symptoms, benefits, risks, and evidence strength.",
  },
  {
    icon: "🚨",
    title: "Drug interaction checker",
    body:
      "43 cannabis-drug interactions across red, yellow, and green severity. Real-time warnings during prescribing, acknowledged + signed before submission.",
  },
  {
    icon: "📚",
    title: "Research corpus",
    body:
      "50+ peer-reviewed studies indexed with structured dosing data. The Research Agent surfaces evidence at the point of care — traceable to source.",
  },
  {
    icon: "🌿",
    title: "APSO note format",
    body:
      "Assessment → Plan → Subjective → Objective. Re-ordered for how clinicians actually think, not how legacy EMRs force them to document.",
  },
  {
    icon: "🏥",
    title: "Dispensary-ready",
    body:
      "SKU-based product catalog, dispensary locator, pharmacy pickup notes auto-sent to patients with brand, dosing, and pickup location.",
  },
];
