import dynamic from "next/dynamic";
import Link from "next/link";
import type { Metadata } from "next";
import { AccountAuthFallback } from "@/components/leafmart/AccountAuthFallback";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Leafmart account to track orders and outcomes.",
};

const ClerkLeafmartSignUp = dynamic(() => import("./clerk-leafmart-signup"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-[24px] bg-[var(--bg-deep)] animate-pulse" />
  ),
});

export default function LeafmartSignupPage() {
  const clerkEnabled = process.env.AUTH_PROVIDER === "clerk";

  return (
    <section className="px-6 lg:px-14 py-16 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        {/* Left: editorial copy */}
        <div className="hidden lg:block">
          <p className="eyebrow text-[var(--leaf)] mb-3">Get started</p>
          <h1 className="font-display text-[48px] xl:text-[60px] font-normal tracking-[-1.6px] leading-[1.02] text-[var(--ink)] mb-5">
            Create your
            <br />
            <em className="font-accent not-italic text-[var(--leaf)]">Leafmart account.</em>
          </h1>
          <p className="text-[16px] text-[var(--text-soft)] leading-relaxed max-w-[440px] mb-6">
            One account for the marketplace, the outcomes you log, and your link
            to the Leafjourney clinical desk.
          </p>
          <ul className="space-y-3 text-[14px] text-[var(--text-soft)]">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[var(--leaf-soft)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
              </span>
              Track orders and reorder in one click.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[var(--leaf-soft)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
              </span>
              Log outcomes that improve future shelf rankings.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[var(--leaf-soft)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
              </span>
              Connect to a clinician when you want one.
            </li>
          </ul>
        </div>

        {/* Right: auth card */}
        <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--border)] p-7 sm:p-10 max-w-[480px] w-full mx-auto">
          <div className="lg:hidden mb-6">
            <p className="eyebrow text-[var(--leaf)] mb-2">Get started</p>
            <h1 className="font-display text-[32px] font-normal tracking-[-1px] leading-[1.05] text-[var(--ink)]">
              Create your account
            </h1>
          </div>

          {clerkEnabled ? (
            <ClerkLeafmartSignUp />
          ) : (
            <AccountAuthFallback mode="signup" />
          )}

          <p className="text-[12.5px] text-[var(--muted)] mt-6 text-center">
            Already have an account?{" "}
            <Link href="/leafmart/login" className="text-[var(--leaf)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
