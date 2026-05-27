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
