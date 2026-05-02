import type { MetadataRoute } from "next";

/**
 * PWA manifest — EMR-031
 *
 * Drives the installable web-app experience for the patient portal +
 * clinician workspace. Next 14's `app/manifest.ts` route emits
 * `/manifest.webmanifest` with the correct content-type, so the only thing
 * we need to do here is shape the JSON. Icons live under /public/icons/* —
 * the entries below match the actual filenames so we don't ship a manifest
 * that points at 404s.
 *
 * The standalone display + theme color make Leafjourney install with the
 * Apple-style chromeless feel called out in the data-collection directive.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leafjourney — Modern cannabis care",
    short_name: "Leafjourney",
    description:
      "AI-native cannabis care platform — patient portal, clinician workspace, and practice operations in one home.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4ee",
    theme_color: "#3f6e4f",
    lang: "en",
    dir: "ltr",
    categories: ["health", "medical", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Log a dose",
        short_name: "Log dose",
        description: "Quick post-dose check-in.",
        url: "/portal/log-dose",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Today's check-in",
        short_name: "Check-in",
        description: "How are you feeling today?",
        url: "/portal/outcomes",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Messages",
        short_name: "Messages",
        description: "Talk to your care team.",
        url: "/portal/messages",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
    prefer_related_applications: false,
  };
}
