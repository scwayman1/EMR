import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NativeBridge } from "@/components/shell/NativeBridge";
import { ProjectorMode } from "@/components/shell/ProjectorMode";

export const metadata: Metadata = {
  title: {
    default: "Leafjourney — Modern cannabis care",
    template: "%s · Leafjourney",
  },
  description:
    "An AI-native care platform for modern cannabis medicine. Patient portal, clinician workspace, and practice operations in one unified system.",
  robots: { index: false, follow: false }, // private by default in V1
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Leafjourney",
  },
  applicationName: "Leafjourney",
  formatDetection: {
    telephone: false,
  },
};

// Viewport export (EMR-031 / EMR-051) — controls the mobile/tablet
// rendering scale and respects iOS safe-area insets so the EMR works
// on phones, tablets, foldables, projector outputs, and the eventual
// Capacitor/React Native native wrappers without a layout regression.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFCF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1410" },
  ],
};

// ClerkProvider was removed from the hot boot path to unblock Render deploys.
// The previous top-level import forced @clerk/nextjs to initialize during
// Next.js module evaluation, which — combined with the Clerk v7 / Next 14
// peer-dep mismatch — was crashing the web server before it could bind a
// port. Clerk is feature-flagged off in prod (AUTH_PROVIDER=iron-session),
// so wrapping the tree with ClerkProvider here wasn't actually doing
// anything. Re-enable via dynamic import when Clerk is properly wired and
// the peer-dep / env-var story is resolved.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-leafmart" suppressHydrationWarning>
      <head>
        {/* Google Fonts — Leafmart design system typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600&family=Instrument+Serif:ital@1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("leafjourney-theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-bg text-text">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-ink focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to content
        </a>
        <NativeBridge />
        <ProjectorMode />
        {children}
      </body>
    </html>
  );
}
