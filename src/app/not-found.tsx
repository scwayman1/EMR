import Link from "next/link";
import { EmptyIllustration } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Ambient background wash */}
      <div className="absolute inset-0 ambient pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 py-20 max-w-lg">
        <EmptyIllustration size={160} className="mb-8 opacity-80" />

        <h1 className="font-display text-4xl md:text-5xl text-text tracking-tight leading-[1.08] mb-4">
          This path doesn&rsquo;t lead anywhere.
        </h1>

        <p className="text-[15px] text-text-muted leading-relaxed mb-8 max-w-sm">
          The page you were looking for could not be found. It may have been
          moved, or perhaps it was never planted here at all.
        </p>

        <Link href="/">
          <Button size="lg">Go home</Button>
        </Link>

        <p className="text-xs text-text-subtle mt-10 tracking-wide uppercase">
          404 &middot; Not found
        </p>
      </div>
    </div>
  );
}
