import Link from "next/link";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <PageShell maxWidth="max-w-[700px]">
      <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-24 h-24 bg-[var(--surface-muted)] rounded-full flex items-center justify-center mb-8">
          <span className="text-5xl">🧭</span>
        </div>
        
        <Eyebrow className="justify-center mb-4 text-[var(--accent)]">Error 404</Eyebrow>
        
        <h1 className="font-display text-4xl md:text-5xl text-text tracking-tight mb-4 leading-tight">
          We couldn't find that page
        </h1>
        
        <p className="text-[17px] text-text-muted max-w-md mx-auto leading-relaxed mb-10">
          The link you followed may be broken, or the page may have been moved. Let's get you back to your dashboard.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/portal" className="w-full sm:w-auto">
            <Button size="lg" className="w-full min-w-[180px]">
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/portal/messages" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full min-w-[180px]">
              Message Care Team
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
