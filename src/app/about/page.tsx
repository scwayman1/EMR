import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";

export const metadata = {
  title: "About — Green Path Health",
  description:
    "Meet the founders behind Green Path Health: visionaries rebuilding healthcare from the ground up.",
};

const FOUNDERS = [
  {
    name: "Dr. Neal H. Patel",
    title: "Co-Founder & CEO",
    bio: "Physician, innovator, and cannabis medicine pioneer. Dr. Patel combines decades of clinical experience with a fearless vision for patient-centered care. A true shaman of modern medicine — blending evidence-based practice with deep compassion for every patient's journey.",
    initials: "NP",
    gradient: "from-accent to-accent-strong",
  },
  {
    name: "Scott Wayman",
    title: "Co-Founder & Chief Product and Technology Officer",
    bio: "AI architect, serial entrepreneur, and EMR visionary. Scott brings deep expertise in artificial intelligence and enterprise software to reimagine what a medical record system can be. His mission: build technology that serves the human, not the other way around.",
    initials: "SW",
    gradient: "from-highlight to-highlight-hover",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient wash */}
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
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-12 pb-16">
        <Eyebrow className="mb-6">Our story</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-text max-w-3xl">
          We didn&apos;t set out to disrupt healthcare.
          <br />
          <span className="text-accent">We set out to rebuild it.</span>
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-7 max-w-2xl leading-relaxed">
          As doctors and patients, we are done with the current EMR models.
          They&apos;re outdated, archaic, not user friendly, and intimidating.
          We aim to create a revolutionary new EMR from scratch.
        </p>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Mission Statement */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-3xl mx-auto text-center">
            <LeafSprig size={32} className="text-accent mx-auto mb-6" />
            <blockquote className="font-display text-2xl md:text-3xl text-text tracking-tight leading-snug">
              &ldquo;This isn&apos;t MyChart. This is MyStory.<br />
              This isn&apos;t a patient&apos;s medical history. This is a patient&apos;s medical journey.<br />
              This isn&apos;t a patient&apos;s problem, it&apos;s a patient&apos;s process.&rdquo;
            </blockquote>
            <p className="text-text-muted mt-6 text-[15px] leading-relaxed max-w-xl mx-auto">
              We will not disrupt healthcare. We will destroy it and rebuild it
              the right way — with heart, with soul, and with technology that
              serves the human being at its center.
            </p>
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-20">
        <div className="max-w-2xl mb-14">
          <Eyebrow className="mb-4">The team</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Built by people who live this every day.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {FOUNDERS.map((founder) => (
            <article
              key={founder.name}
              className="relative bg-surface-raised rounded-2xl border border-border p-8 shadow-sm overflow-hidden card-hover"
            >
              {/* Avatar placeholder */}
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${founder.gradient} flex items-center justify-center mb-6 shadow-md`}
              >
                <span className="font-display text-2xl text-white/90 select-none">
                  {founder.initials}
                </span>
              </div>
              <h3 className="font-display text-xl text-text tracking-tight">
                {founder.name}
              </h3>
              <p className="text-xs text-accent font-medium uppercase tracking-wider mt-1">
                {founder.title}
              </p>
              <p className="text-sm text-text-muted mt-4 leading-relaxed">
                {founder.bio}
              </p>
            </article>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Values */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-14">
          <Eyebrow className="mb-4">What we believe</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Principles that guide every line of code.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {VALUES.map((value, i) => (
            <div
              key={value.title}
              className="flex gap-5 bg-surface-raised rounded-2xl border border-border p-7 shadow-sm card-hover"
            >
              <span className="font-display text-[32px] leading-none text-accent/30 select-none shrink-0">
                0{i + 1}
              </span>
              <div>
                <h3 className="font-display text-lg text-text tracking-tight">
                  {value.title}
                </h3>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                  {value.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-2xl">
            <Eyebrow className="mb-4">Join us</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
              This is just the beginning.
            </h2>
            <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
              Whether you&apos;re a patient seeking better care, a provider
              ready for better tools, or a partner who shares our vision —
              we&apos;d love to hear from you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">Create your account</Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="ghost">
                  Back to home
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

const VALUES = [
  {
    title: "Patients are people, not charts",
    body: "Every feature we build starts with one question: does this make the human being at the center feel seen, heard, and cared for?",
  },
  {
    title: "Cannabis is medicine",
    body: "We treat cannabis with the same rigor as any pharmaceutical — evidence-based dosing, drug interaction checking, outcome tracking, and clinical documentation.",
  },
  {
    title: "AI serves the clinician",
    body: "Our AI agents draft notes, suggest codes, and surface research — but the physician always has final authority. Technology amplifies care, never replaces it.",
  },
  {
    title: "Data belongs to the patient",
    body: "Your health data is yours. We build with privacy by design, HIPAA compliance, and the conviction that patients should own their medical story.",
  },
];
