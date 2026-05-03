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
