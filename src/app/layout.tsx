import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UniversalFeedbackFab } from "@/components/feedback/UniversalFeedbackFab";
import { ClerkProvider } from "@clerk/nextjs";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "Leafjourney — Modern cannabis care",
    template: "%s · Leafjourney",
  },
  description:
    "An AI-native care platform for modern cannabis medicine. Patient portal, clinician workspace, and practice operations in one unified system.",
  robots: { index: false, follow: false }, // private by default in V1
};

// Mobile portrait iOS polish — `viewport-fit=cover` is required for
// env(safe-area-inset-*) CSS variables to resolve to non-zero values on
// notched / Dynamic Island iPhones. Without this the bottom MobileNav
// and top header underlap the home indicator / notch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFCF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1210" },
  ],
};

// EMR-205: Conditionally wrap with ClerkProvider only if Clerk publishable key is present in env.
// This allows local dev to run cleanly without Clerk Keyless Mode runtime overlays.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
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
        <ToastProvider>
          {children}
          <UniversalFeedbackFab />
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );

  if (hasClerk) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
