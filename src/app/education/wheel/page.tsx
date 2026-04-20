// Public-facing Cannabis Wheel page. Server component that wraps the client
// wheel with a plain-language introduction. No login required.

import Link from "next/link";
import { CannabisWheel } from "@/components/education/cannabis-wheel";
import { Wordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = {
  title: "Cannabis Wheel — Leafjourney Education",
  description:
    "Explore cannabinoids and terpenes in plain language. Tap to learn what each compound does and which aromatic oils it commonly pairs with.",
};

export default function CannabisWheelPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="mx-auto flex h-20 max-w-[1320px] items-center justify-between px-6 lg:px-12">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/education"
            className="px-3 py-2 text-sm font-medium text-accent"
          >
            Education
          </Link>
          <Link
            href="/store"
            className="px-3 py-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            Store
          </Link>
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Demo</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-[1320px] px-6 pb-6 pt-8 text-center lg:px-12">
        <Eyebrow className="mb-4 justify-center">Interactive</Eyebrow>
        <h1 className="font-display text-4xl tracking-tight text-text md:text-5xl lg:text-6xl">
          Cannabis Wheel
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-muted">
          Cannabis is more than THC. This wheel maps the main cannabinoids
          alongside the aromatic terpenes that shape how each strain feels.
          Tap any segment to see plain-language effects and common pairings.
        </p>
      </div>

      {/* Intro strip */}
      <div className="mx-auto max-w-[1100px] px-6 pb-6 lg:px-12">
        <div className="grid gap-4 rounded-2xl border border-border/70 bg-surface p-5 text-sm text-text-muted md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
              Outer ring
            </p>
            <p className="mt-1 leading-relaxed">
              <span className="font-medium text-text">Cannabinoids</span> are
              the active chemical compounds in the cannabis plant. THC and CBD
              are the best known, but each cannabinoid has a distinct feel and
              a growing body of research behind it.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
              Inner ring
            </p>
            <p className="mt-1 leading-relaxed">
              <span className="font-medium text-text">Terpenes</span> are the
              aromatic oils shared with pine, citrus, lavender, and pepper.
              They shape a strain&rsquo;s smell and are thought to nudge its
              effects in different directions.
            </p>
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div className="mx-auto max-w-[1100px] px-6 py-8 lg:px-12">
        <CannabisWheel />
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-border py-8 text-center text-xs text-text-subtle">
        <p>
          Educational information only. Effects vary from person to person and
          this is not medical advice — always talk to your provider.
        </p>
        <p className="mt-1">
          <Link href="/education" className="text-accent hover:underline">
            Back to Education
          </Link>
        </p>
      </footer>
    </div>
  );
}
