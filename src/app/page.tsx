import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { HeroArt } from "@/components/ui/hero-art";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { AmbientMusicPlayer } from "@/components/ui/ambient-music";

// Public marketing / acquisition home page. Editorial, warm, botanical.
// Intentionally distinct from the authenticated app shell — no nav chrome,
// generous whitespace, serif display type, custom SVG artwork.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Global ambient wash behind the whole page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 85% 10%, var(--highlight-soft), transparent 65%)," +
            "radial-gradient(ellipse 50% 60% at 10% 90%, var(--accent-soft), transparent 60%)",
        }}
      />

      {/* Top nav */}
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
            href="/pricing"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/store"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
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
            <Button size="sm">Start your care</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <Eyebrow className="mb-6">Modern cannabis medicine</Eyebrow>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-text">
              A calmer, warmer home for your care.
            </h1>
            <p className="text-[17px] md:text-lg text-text-muted mt-7 max-w-xl leading-relaxed">
              Meet your care team, keep your records organized, track how
              you&apos;re actually feeling, and send a message whenever you
              need one. Designed to feel as considered as the care itself.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg">Create your account</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  I already have an account
                </Button>
              </Link>
            </div>

            {/* Quiet trust row */}
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-text-subtle">
              <span className="inline-flex items-center gap-2">
                <LeafSprig size={14} className="text-accent/70" />
                Physician-led care
              </span>
              <span className="inline-flex items-center gap-2">
                <LeafSprig size={14} className="text-accent/70" />
                HIPAA-ready infrastructure
              </span>
              <span className="inline-flex items-center gap-2">
                <LeafSprig size={14} className="text-accent/70" />
                Secure by design
              </span>
            </div>
          </div>

          {/* Right: hero artwork */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="relative mx-auto max-w-[540px]">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[32px] bg-surface-raised/40 backdrop-blur-sm"
              />
              <div className="relative rounded-[28px] overflow-hidden border border-border shadow-lg">
                <HeroArt />
              </div>
              {/* Floating pill callouts */}
              <div className="absolute -left-4 top-10 hidden md:block bg-surface-raised border border-border rounded-full shadow-md px-4 py-2 text-xs font-medium text-text">
                <span className="font-display text-sm mr-1">7d</span>
                <span className="text-text-muted">pain trend</span>
              </div>
              <div className="absolute -right-6 bottom-16 hidden md:flex items-center gap-2 bg-surface-raised border border-border rounded-full shadow-md px-4 py-2 text-xs font-medium text-text">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Scribe draft ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slogan strip */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-8">
        <p className="font-display text-center text-xl md:text-2xl text-accent tracking-tight italic">
          Personalized cannabis care, powered by heart and soul.
        </p>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Cannabis Plant 101 — a sacred tribute */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.04] via-surface-raised to-highlight/[0.03] p-10 md:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 40% 60% at 90% 20%, var(--accent-soft), transparent 70%)",
            }}
          />
          <div className="relative max-w-3xl mx-auto text-center">
            <Eyebrow className="mb-5 justify-center">The sacred plant</Eyebrow>
            <p className="font-display text-lg md:text-xl text-text leading-relaxed tracking-tight">
              For thousands of years, the cannabis plant has been a companion to
              humanity — a healer, a teacher, and a quiet source of relief for
              those in pain. Its roots reach deep into the soil of ancient
              medicine, its leaves hold compounds that speak directly to the
              human body through the endocannabinoid system. Cannabis is not a
              trend. It is a sacred botanical ally with the power to ease
              suffering, restore balance, and open pathways to wellness that
              modern medicine is only beginning to understand. All who use this
              platform shall respect the plant and use it with intention, care,
              and reverence for its remarkable healing properties.
            </p>
          </div>
        </div>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Trust panels */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-14">
          <Eyebrow className="mb-4">What&apos;s inside</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Everything for your care — in one calm place.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((item, i) => (
            <article
              key={item.title}
              className="relative bg-surface-raised rounded-2xl border border-border p-7 shadow-sm overflow-hidden card-hover"
            >
              {/* quiet number in the corner */}
              <span className="absolute top-5 right-6 font-display text-[40px] leading-none text-border-strong/70 select-none">
                0{i + 1}
              </span>
              <LeafSprig size={22} className="text-accent mb-5" />
              <h3 className="font-display text-xl text-text tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-text-muted mt-3 leading-relaxed pr-10">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Closing / CTA strip */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-2xl">
            <Eyebrow className="mb-4">Ready when you are</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
              Care, kept close.
            </h2>
            <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
              Creating an account takes under a minute. We&apos;ll guide you
              through everything else.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">Create your account</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="ghost">
                  Sign in instead
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Ambient music player — EMR-041 */}
      <AmbientMusicPlayer />

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
              &copy; {new Date().getFullYear()} Green Path Health. A demonstration product —
              not a substitute for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: "Your records, in order",
    body: "Upload notes, labs, and letters. We organize, label, and keep them close — ready for every visit.",
  },
  {
    title: "Symptoms you can see",
    body: "Short check-ins that reveal real trends. Your care team sees how things are actually going, not just how you felt in the waiting room.",
  },
  {
    title: "A care team that answers",
    body: "Secure messaging in one thread. No phone tag, no portal maze, no guesswork about what to do next.",
  },
];
