import dynamic from "next/dynamic";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Leafmart account.",
};

const ClerkLeafmartSignIn = dynamic(() => import("./clerk-leafmart-signin"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-[24px] bg-[var(--bg-deep)] animate-pulse" />
  ),
});

export default function LeafmartLoginPage() {
  return (
    <section className="px-6 lg:px-14 py-16 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        {/* Left: editorial copy */}
        <div className="hidden lg:block">
          <p className="eyebrow text-[var(--leaf)] mb-3">Welcome back</p>
          <h1 className="font-display text-[48px] xl:text-[60px] font-normal tracking-[-1.6px] leading-[1.02] text-[var(--ink)] mb-5">
            Sign in to your
            <br />
            <em className="font-accent not-italic text-[var(--leaf)]">Leafmart account.</em>
          </h1>
          <p className="text-[16px] text-[var(--text-soft)] leading-relaxed max-w-[440px]">
            Pick up where you left off — past orders, your saved shelf, and your
            outcomes timeline are all here.
          </p>
        </div>

        {/* Right: auth card */}
        <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--border)] p-7 sm:p-10 max-w-[480px] w-full mx-auto">
          <div className="lg:hidden mb-6">
            <p className="eyebrow text-[var(--leaf)] mb-2">Welcome back</p>
            <h1 className="font-display text-[32px] font-normal tracking-[-1px] leading-[1.05] text-[var(--ink)]">
              Sign in
            </h1>
          </div>

          <ClerkLeafmartSignIn />

          <p className="text-[12.5px] text-[var(--muted)] mt-6 text-center leading-relaxed">
            By signing in you agree to our{" "}
            <Link href="/leafmart/about" className="text-[var(--leaf)] hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/leafmart/about" className="text-[var(--leaf)] hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

