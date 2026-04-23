"use client";

import { Button } from "@/components/ui/button";

export default function ClinicianError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <p className="text-3xl mb-4">🌿</p>
        <h2 className="font-display text-xl text-text mb-3">
          Something went wrong
        </h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          We hit an unexpected issue loading this page. Your patients&apos;
          data is safe. Try refreshing — if it keeps happening, let us know.
        </p>
        <Button onClick={reset}>Try again</Button>
        {error.digest && (
          <p className="text-[10px] text-text-subtle mt-4">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
