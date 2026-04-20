import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { DrugMixUI } from "@/components/education/drug-mix";

export const metadata: Metadata = {
  title: "Drug Mix — Cannabis Drug Interaction Checker | Leafjourney",
  description:
    "Free public tool to check how your medications may interact with cannabis (THC, CBD, balanced, or CBG). Not medical advice.",
};

export default function DrugMixPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="max-w-[1320px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/education"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Education
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
            <Button size="sm">Demo</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-8 pb-8 text-center">
        <Eyebrow className="justify-center mb-4">Free &middot; No login required</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text">
          Drug Mix
        </h1>
        <p className="text-lg text-text-muted mt-4 max-w-2xl mx-auto leading-relaxed">
          Check how your medications may interact with cannabis. Add your
          prescriptions, pick your cannabis product, and see a simple
          traffic-light breakdown.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 lg:px-12 pb-16">
        <DrugMixUI />
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-8 text-center text-xs text-text-subtle">
        <p>Leafjourney Education is free for everyone. No login required.</p>
        <p className="mt-1">
          Information is for educational purposes only — always consult a
          healthcare provider.
        </p>
      </footer>
    </div>
  );
}
