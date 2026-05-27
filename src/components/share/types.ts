// ---------------------------------------------------------------------------
// EMR-308 — Share types
// ---------------------------------------------------------------------------
// One ShareTarget per platform. Each target has:
//   - a stable id (used in analytics)
//   - a label and svg icon for the UI
//   - a `buildUrl(payload)` that produces the deep link
//
// New platforms drop in by adding a new ShareTarget; the rest of the
// system doesn't need to change.
// ---------------------------------------------------------------------------

export interface SharePayload {
  /** Canonical URL of the page being shared. */
  url: string;
  /** Page title — used as default share text. */
  title: string;
  /** One-line description. */
  description?: string;
  /** Optional hashtags for platforms that respect them. */
  hashtags?: string[];
  /** Optional URL to a leaf-art share card image (OG-style). */
  imageUrl?: string;
  /** Where in the app the share originated. Used for analytics. */
  source: "education" | "research" | "product" | "directory" | "other";
}

export type ShareTargetId =
  | "x"
  | "facebook"
  | "linkedin"
  | "threads"
  | "reddit"
  | "whatsapp"
  | "email"
  | "sms"
  | "copy-link"
  | "native";

export interface ShareTarget {
  id: ShareTargetId;
  label: string;
  /** Inline SVG path or simple icon string. Lucide name when available. */
  iconName: string;
  /**
   * Build the platform-specific share URL.
   * `null` means "this target has no URL — handle it in the dialog".
   * (Used for copy-link and native-share.)
   */
  buildUrl: (payload: SharePayload) => string | null;
}
