import Link from "next/link";

export function AccountAuthFallback({ mode }: { mode: "signin" | "signup" }) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-[14px] text-[var(--text-soft)] leading-relaxed">
        Hosted authentication isn&rsquo;t enabled in this environment yet.
        Set <code className="font-mono text-[12px] bg-[var(--bg-deep)] rounded px-1.5 py-0.5">AUTH_PROVIDER=clerk</code> in
        your env to turn it on, or use the legacy form for now.
      </p>
      <Link
        href={mode === "signin" ? "/login" : "/sign-up"}
        className="inline-flex items-center justify-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-6 py-3 text-[14px] font-medium hover:bg-[var(--leaf)] transition-colors"
      >
        Continue to legacy {mode === "signin" ? "sign-in" : "sign-up"}
      </Link>
    </div>
  );
}
