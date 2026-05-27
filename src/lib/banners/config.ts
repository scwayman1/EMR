/**
 * config.ts — static source of truth for system-wide banners.
 *
 * Edit this file to add, remove, or toggle a banner. Persistence at this
 * stage is intentionally just a TS module so a deploy ships banner changes
 * — no DB, no API, no admin write surface.
 *
 * v1 lifecycle:
 *   1. Edit this file (or flip `enabled: false`).
 *   2. Bump `id` if you want previously-dismissed users to see the banner
 *      again (dismissal is keyed by id in localStorage).
 *   3. Open a PR; merge ships the banner.
 *
 * Follow-up — tracked, not blocking:
 *   - Promote to a DB-backed `Banner` model + admin write surface when
 *     persistence requirements firm up (per-org banners, scheduled
 *     publish windows, audience targeting beyond role layouts).
 *   - Wire `useActiveSystemBanners()` to derive system-health banners
 *     from `/api/status` (route lands in PR #479 follow-ups) so a real
 *     degradation surfaces automatically instead of waiting on a deploy.
 *
 * Sibling primitives (do NOT collide):
 *   - Toast (src/components/ui/toast.tsx) is transient + per-user.
 *   - Notification center (src/components/ui/notification-center.tsx)
 *     is per-user + persisted-read-state.
 *   - SystemBanner is system-wide + dismissed-per-device.
 */

export type SystemBannerSeverity = "info" | "warning" | "danger";

export type SystemBannerCategory =
  | "system-health"
  | "maintenance"
  | "announcement"
  | "billing";

export interface SystemBannerConfig {
  /** Stable, URL-safe id. Bump to re-show a banner that users dismissed. */
  id: string;
  /** Bucket for the admin viewer + future targeting. */
  category: SystemBannerCategory;
  /** Visual + accessibility severity. */
  severity: SystemBannerSeverity;
  /** Short human-readable line. Keep under ~140 chars. */
  message: string;
  /** Optional CTA label rendered as a link. */
  ctaLabel?: string;
  /** Optional CTA target. External links should be absolute URLs. */
  ctaHref?: string;
  /** When true, a close (X) is rendered and dismissal is persisted. */
  dismissible?: boolean;
  /** Set to false to keep the entry but hide it. */
  enabled: boolean;
  /**
   * Optional ISO window. If `startsAt` is in the future or `endsAt` has
   * passed, the banner is treated as inactive. Both bounds are inclusive
   * of the active window.
   */
  startsAt?: string;
  endsAt?: string;
  /**
   * Optional surface allowlist. If omitted, the banner shows on every
   * surface that mounts <SystemBannerRail/>. Today the rail is mounted
   * in the clinician + operator layouts.
   */
  surfaces?: Array<"clinician" | "operator" | "super-admin">;
}

/**
 * Active banner catalogue. Order matters: earlier entries render on top.
 *
 * This array is intentionally exported as a plain const — no factory, no
 * default-export — so a future migration to a DB read can swap the source
 * without changing the type contract.
 */
export const SYSTEM_BANNERS: readonly SystemBannerConfig[] = [
  // Example placeholder — flip `enabled` to true to surface in-app.
  // Keep at least one disabled example here so the admin viewer has
  // something to render in dev environments.
  {
    id: "welcome-v1",
    category: "announcement",
    severity: "info",
    message:
      "Welcome to LeafJourney. New here? The Help drawer (?) has a guided tour.",
    ctaLabel: "View status",
    ctaHref: "/status",
    dismissible: true,
    enabled: false,
  },
] as const;
