// Clerk Sign-Up page — gated behind AUTH_PROVIDER=clerk.
//
// EMR-205: see the sibling /sign-in/page.tsx comment. Moving the
// @clerk/nextjs import into a client-only dynamic component so a missing
// Clerk config can't crash the (auth) route group.

import dynamic from "next/dynamic";
import Link from "next/link";

export const metadata = { title: "Sign up — Leafjourney" };

const ClerkSignUpBox = dynamic(() => import("./clerk-signup-box"), {
  ssr: false,
});

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
      <ClerkSignUpBox />
    </div>
  );
}
