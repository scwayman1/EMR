import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Leafjourney — Modern cannabis care",
    template: "%s · Leafjourney",
  },
  description:
    "An AI-native care platform for modern cannabis medicine. Patient portal, clinician workspace, and practice operations in one unified system.",
  robots: { index: false, follow: false }, // private by default in V1
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkEnabled = process.env.AUTH_PROVIDER === "clerk";

  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("leafjourney-theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-ink focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );

  // Wrap in ClerkProvider only when Clerk is enabled.
  // This keeps the existing iron-session flow untouched when AUTH_PROVIDER is unset.
  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
