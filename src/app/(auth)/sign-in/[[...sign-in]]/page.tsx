// Clerk Sign-In page — gated behind AUTH_PROVIDER=clerk.
//
// EMR-205: the top-level `import { SignIn } from "@clerk/nextjs"` used to
// run at module load and crashed the whole (auth) route group when Clerk
// env vars weren't set — including /login, which shares this group.
// Dynamic-importing inside the render path keeps @clerk/nextjs out of
// the hot boot path until Clerk is actually wired.

import dynamic from "next/dynamic";
import Link from "next/link";

export const metadata = { title: "Sign in — Leafjourney" };

const ClerkSignInBox = dynamic(() => import("./clerk-signin-box"), {
  ssr: false,
});

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
      <ClerkSignInBox />
    </div>
  );
}
