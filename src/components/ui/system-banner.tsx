"use client";

/**
 * SystemBanner — full-width, sticky-to-top banner primitive for system
 * status, scheduled maintenance, announcements, and important holds.
 *
 * Distinct from sibling primitives:
 *   - <Toast/> (src/components/ui/toast.tsx) — transient, per-user,
 *     bottom-of-viewport.
 *   - <NotificationCenter/> (src/components/ui/notification-center.tsx)
 *     — per-user inbox with read state.
 *   - <SystemBanner/> — system-wide, sticky top, dismissed per-device.
 *
 * Usage (single banner):
 *   <SystemBanner id="maint-2026-05-25" severity="warning"
 *                 message="Scheduled maintenance Sunday 02:00 ET"
 *                 ctaLabel="Details" ctaHref="/status" dismissible />
 *
 * Usage (active set, recommended for layouts):
 *   <SystemBannerRail surface="clinician" />
 *
 * Behaviour:
 *   - Sticky top, full-width, z-40 (just below dialog z-50).
 *   - Severity drives colour + aria role.
 *   - `dismissible` shows an X; dismissal persists per-banner-id in
 *     localStorage under `emr.banners.dismissed.v1.<id>`.
 *   - Honours `prefers-reduced-motion`: skips the slide-in animation.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";
import {
  useActiveSystemBanners,
  type ActiveBannerSurface,
} from "@/lib/banners/system-banner-source";

export type SystemBannerSeverity = "info" | "warning" | "danger";

export interface SystemBannerProps {
  /** Stable id. Drives the localStorage dismissal key. */
  id: string;
  /** Visual + accessibility severity. */
  severity?: SystemBannerSeverity;
  /** Primary message line. */
  message: ReactNode;
  /** Optional CTA label rendered as a link. */
  ctaLabel?: string;
  /** Optional CTA target. */
  ctaHref?: string;
  /** When true, an X closes the banner and persists the dismissal. */
  dismissible?: boolean;
  /**
   * Optional className passthrough. Use sparingly — the primitive owns
   * its own colour + sticky + width contract.
   */
  className?: string;
}

const DISMISS_KEY_PREFIX = "emr.banners.dismissed.v1.";

/**
 * Severity -> Tailwind class bundles. Kept inline (no design-system token
 * lookup) so the banner is uniformly loud regardless of role theme — same
 * rationale as the impersonation banner.
 */
const SEVERITY_STYLES: Record<
  SystemBannerSeverity,
  { wrap: string; dot: string; cta: string; close: string }
> = {
  info: {
    wrap: "bg-sky-500 text-white border-b border-sky-700/40",
    dot: "bg-white/80",
    cta: "underline decoration-white/70 underline-offset-2 hover:decoration-white",
    close: "hover:bg-white/15 focus-visible:ring-white/70",
  },
  warning: {
    wrap: "bg-amber-400 text-amber-950 border-b border-amber-600/40",
    dot: "bg-amber-900",
    cta:
      "underline decoration-amber-900/70 underline-offset-2 hover:decoration-amber-900",
    close: "hover:bg-amber-900/10 focus-visible:ring-amber-900/70",
  },
  danger: {
    wrap: "bg-red-600 text-white border-b border-red-800/50",
    dot: "bg-white/80",
    cta: "underline decoration-white/70 underline-offset-2 hover:decoration-white",
    close: "hover:bg-white/15 focus-visible:ring-white/70",
  },
};

function readDismissed(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY_PREFIX + id) === "1";
  } catch {
    // Private mode / quota / disabled storage — treat as not dismissed.
    return false;
  }
}

function writeDismissed(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY_PREFIX + id, "1");
  } catch {
    // Swallow — dismissal is best-effort.
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Single banner. Renders nothing once dismissed.
 */
export function SystemBanner({
  id,
  severity = "info",
  message,
  ctaLabel,
  ctaHref,
  dismissible = false,
  className,
}: SystemBannerProps) {
  // Hydrate dismissed state from localStorage AFTER mount so SSR + first
  // paint match. The banner briefly renders for ~1 frame on a dismissed
  // session, then collapses — acceptable for a system banner, and avoids
  // a hydration mismatch (server cannot read localStorage).
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setDismissed(readDismissed(id));
    setReduceMotion(prefersReducedMotion());
  }, [id]);

  const onClose = useCallback(() => {
    setDismissed(true);
    writeDismissed(id);
  }, [id]);

  if (hydrated && dismissed) return null;

  const styles = SEVERITY_STYLES[severity];
  // role="alert" interrupts the AT user — reserve for warning + danger.
  const role = severity === "info" ? "status" : "alert";
  const ariaLive = severity === "danger" ? "assertive" : "polite";

  return (
    <div
      data-system-banner
      data-banner-id={id}
      data-severity={severity}
      role={role}
      aria-live={ariaLive}
      className={cn(
        "sticky top-0 z-40 w-full",
        styles.wrap,
        // Slide-in: skipped when prefers-reduced-motion is set OR before
        // hydration (avoids animating SSR HTML on first paint).
        hydrated && !reduceMotion && "animate-in slide-in-from-top-2 duration-200",
        className,
      )}
    >
      <div className="mx-auto flex items-center justify-between gap-4 px-4 py-2 max-w-[1600px]">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden
            className={cn(
              "inline-block h-2 w-2 rounded-full shrink-0",
              styles.dot,
              hydrated && !reduceMotion && "animate-pulse",
            )}
          />
          <p className="text-[13px] font-semibold truncate">{message}</p>
          {ctaLabel && ctaHref ? (
            <a
              href={ctaHref}
              className={cn(
                "text-[13px] font-semibold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-sm",
                styles.cta,
              )}
            >
              {ctaLabel}
            </a>
          ) : null}
        </div>
        {dismissible ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss banner"
            className={cn(
              "shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-current focus-visible:outline-none focus-visible:ring-2",
              styles.close,
            )}
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * SystemBannerRail — renders every active banner for `surface`, stacked.
 * Mount once per surface layout (above AppShell, like ImpersonationBanner).
 */
export interface SystemBannerRailProps {
  surface: ActiveBannerSurface;
}

export function SystemBannerRail({ surface }: SystemBannerRailProps) {
  const banners = useActiveSystemBanners({ surface });
  // Memoise the rendered list — avoids re-creating React elements when
  // the parent layout re-renders for unrelated reasons.
  const rendered = useMemo(
    () =>
      banners.map((b) => (
        <SystemBanner
          key={b.id}
          id={b.id}
          severity={b.severity}
          message={b.message}
          ctaLabel={b.ctaLabel}
          ctaHref={b.ctaHref}
          dismissible={b.dismissible}
        />
      )),
    [banners],
  );

  if (rendered.length === 0) return null;
  return <>{rendered}</>;
}
