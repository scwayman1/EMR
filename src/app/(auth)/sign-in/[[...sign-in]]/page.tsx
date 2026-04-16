// Clerk Sign-In page — used when AUTH_PROVIDER=clerk
// Falls back to a message when Clerk is not configured.

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export const metadata = { title: "Sign in — Leafjourney" };

export default function SignInPage() {
  const clerkEnabled = process.env.AUTH_PROVIDER === "clerk";

  if (!clerkEnabled) {
    return (
      <div className="text-center space-y-4">
        <h1 className="font-display text-2xl text-text tracking-tight">
          Clerk not yet enabled
        </h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Clerk authentication is configured but not active. Use the legacy sign-in instead.
        </p>
        <Link href="/login" className="inline-block text-sm text-accent hover:underline">
          Go to legacy sign-in →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-display text-2xl text-text tracking-tight mb-2">
        Welcome back
      </h1>
      <p className="text-sm text-text-muted mb-8 text-center">
        Sign in to your Leafjourney account
      </p>

      <SignIn
        signUpUrl="/sign-up"
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
