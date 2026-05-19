// EMR-428 — Friendly "no access" screen for controller-gated surfaces.
//
// Rendered when a user lands on a controller route they don't have access
// to (e.g. middleware allowed-through-coarse-gate but the page itself
// requires SUPER_ADMIN or IMPLEMENTATION_ADMIN). Apple-iOS aesthetic per
// CLAUDE.md: large soft card, generous whitespace, a single primary CTA.
// No role leak — copy is the same for every rejected actor.

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface NoAccessScreenProps {
  /** Override the headline (default: friendly generic). */
  title?: string;
  /** Override the body copy. Keep it short — 1 sentence. */
  description?: string;
  /** Override the CTA label. */
  ctaLabel?: string;
  /** Override the CTA destination. Defaults to home ("/"). */
  ctaHref?: string;
  /** Optional eyebrow (default "403 · Restricted"). Pass null to hide. */
  eyebrow?: string | null;
}

const DEFAULTS = {
  title: "This surface is restricted.",
  description:
    "Only Leafjourney admins can access the Practice Onboarding Controller. Contact your admin if you believe this is a mistake.",
  ctaLabel: "Back to home",
  ctaHref: "/",
  eyebrow: "403 · Restricted",
} as const;

export function NoAccessScreen({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  ctaLabel = DEFAULTS.ctaLabel,
  ctaHref = DEFAULTS.ctaHref,
  eyebrow = DEFAULTS.eyebrow,
}: NoAccessScreenProps) {
  return (
    <div
      role="alert"
      className="min-h-[70vh] flex items-center justify-center px-6 py-20"
    >
      <Card
        tone="glass"
        className="max-w-md w-full p-10 text-center backdrop-blur-xl"
      >
        {eyebrow !== null ? (
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle mb-4">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl md:text-[26px] text-text mb-3 leading-tight">
          {title}
        </h1>
        <p className="text-[15px] text-text-muted leading-relaxed mb-8 mx-auto max-w-sm">
          {description}
        </p>
        <Link href={ctaHref} aria-label={ctaLabel}>
          <Button size="lg">{ctaLabel}</Button>
        </Link>
      </Card>
    </div>
  );
}

export default NoAccessScreen;
