import React from "react";
import Link from "next/link";

/**
 * Clinic ribbon — the four count tiles that live at the top of the
 * Mission Control / clinic home page.
 *
 * EMR-645: three of the four tiles deep-link to the relevant queue:
 *   - Patients today  → /clinic/schedule
 *   - Notes to sign   → /clinic/sign-off
 *   - Approvals       → /clinic/approvals
 *   - Threads         → NOT linked (intentional — the messages product
 *                       doesn't have a stable landing page yet; we keep
 *                       the count visible but render it as a static dot
 *                       so users don't get bounced into a dead end).
 *
 * The Threads tile retains identical visual styling so the ribbon
 * still reads as a uniform row.
 */

interface StatusDotBodyProps {
  color: string;
  pulse?: boolean;
  label: string;
  count: number;
}

/**
 * Pure inner markup for a status dot. Shared between the linked and
 * non-linked variants so the visual styling stays identical.
 */
function StatusDotBody({ color, pulse, label, count }: StatusDotBodyProps) {
  return (
    <>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-50"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
      <span className="font-display text-lg font-medium tabular-nums leading-none text-text group-hover:text-accent transition-colors">
        {count}
      </span>
      <span className="text-[11px] text-text-subtle tracking-wide hidden sm:inline group-hover:text-text transition-colors">
        {label}
      </span>
    </>
  );
}

/**
 * Linked tile — gets hover affordance + cursor:pointer for free via
 * the underlying anchor element.
 */
function LinkedStatusDot({
  href,
  color,
  pulse,
  label,
  count,
}: StatusDotBodyProps & { href: string }) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${count}`}
      title={label}
      className="group flex items-center gap-2 rounded-md px-1.5 py-1 -mx-1.5 -my-1 cursor-pointer transition-colors hover:bg-surface-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <StatusDotBody color={color} pulse={pulse} label={label} count={count} />
    </Link>
  );
}

/**
 * Non-interactive tile — same visual padding/shape as the linked
 * variant but no hover affordance, no cursor pointer.
 */
function StaticStatusDot({ color, pulse, label, count }: StatusDotBodyProps) {
  return (
    <div
      className="group flex items-center gap-2 rounded-md px-1.5 py-1 -mx-1.5 -my-1"
      title={label}
    >
      <StatusDotBody color={color} pulse={pulse} label={label} count={count} />
    </div>
  );
}

export interface ClinicRibbonTilesProps {
  todaysEncountersCount: number;
  notesToSign: number;
  approvalsCount: number;
  threadsCount: number;
}

/**
 * The four-tile cluster. Kept as a flex row so the parent can drop it
 * into the command strip without an extra wrapper.
 */
export function ClinicRibbonTiles({
  todaysEncountersCount,
  notesToSign,
  approvalsCount,
  threadsCount,
}: ClinicRibbonTilesProps) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <LinkedStatusDot
        href="/clinic/schedule"
        color="var(--accent)"
        count={todaysEncountersCount}
        label="Patients today"
      />
      <LinkedStatusDot
        href="/clinic/sign-off"
        color="var(--highlight)"
        pulse={notesToSign > 0}
        count={notesToSign}
        label="Notes to sign"
      />
      <LinkedStatusDot
        href="/clinic/approvals"
        color="var(--highlight)"
        pulse={approvalsCount > 0}
        count={approvalsCount}
        label="Approvals"
      />
      {/* Threads intentionally non-clickable per EMR-645 — same look,
          no link affordance. */}
      <StaticStatusDot
        color="var(--text-subtle)"
        count={threadsCount}
        label="Threads"
      />
    </div>
  );
}
