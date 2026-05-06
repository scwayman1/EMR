// EMR-428 — friendly 403 surface.
//
// Reached when middleware (or a server component throwing "FORBIDDEN") rejects
// a non-admin trying to hit the Practice Onboarding Controller. Intentionally
// minimal: a Card with a one-liner and a "back" link. No PHI, no role-leak.

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <Card className="max-w-md w-full p-8 text-center">
        <p className="text-xs uppercase tracking-wide text-text-subtle mb-3">
          403 &middot; Forbidden
        </p>
        <h1 className="font-display text-2xl text-text mb-3">
          You don&rsquo;t have access to this surface.
        </h1>
        <p className="text-[15px] text-text-muted leading-relaxed mb-6">
          Contact your admin if you believe this is a mistake.
        </p>
        <Link href="/">
          <Button size="lg">Back to home</Button>
        </Link>
      </Card>
    </div>
  );
}
