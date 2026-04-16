// Clerk Sign-Up page — used when AUTH_PROVIDER=clerk
// Falls back to a message when Clerk is not configured.

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export const metadata = { title: "Sign up — Leafjourney" };

export default function SignUpPage() {
  const clerkEnabled = process.env.AUTH_PROVIDER === "clerk";

  if (!clerkEnabled) {
    return (
      <div className="text-center space-y-4">
        <h1 className="font-display text-2xl text-text tracking-tight">
          Clerk not yet enabled
        </h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Clerk authentication is configured but not active. Use the demo request form instead.
        </p>
        <Link href="/signup" className="inline-block text-sm text-accent hover:underline">
          Request a demo →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-display text-2xl text-text tracking-tight mb-2">
        Join Leafjourney
      </h1>
      <p className="text-sm text-text-muted mb-8 text-center">
        Create your account
      </p>

      <SignUp
        signInUrl="/sign-in"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none border-0 p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            formButtonPrimary:
              "bg-accent hover:bg-accent/90 text-white font-medium rounded-md shadow-sm",
            socialButtonsBlockButton:
              "border border-border hover:bg-surface-muted rounded-md",
            formFieldInput:
              "rounded-md border border-border-strong bg-surface focus:border-accent focus:ring-2 focus:ring-accent/20",
            footerActionLink: "text-accent hover:text-accent/80",
          },
          layout: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton",
          },
        }}
      />
    </div>
  );
}
