import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";
import { StatusView } from "./status-view";

export const metadata = {
  title: "System Status — Leafjourney",
  description: "Live service status and incident history for Leafjourney.",
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="max-w-[1080px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
          <Link href="/">
            <Wordmark size="md" />
          </Link>
          <nav className="flex items-center gap-5 text-sm text-text-muted">
            <Link href="/developer" className="hover:text-text">Developers</Link>
            <Link href="/security" className="hover:text-text">Security</Link>
            <Link href="/login" className="text-accent font-medium hover:underline">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1080px] w-full mx-auto px-6 lg:px-12 py-12">
        <StatusView />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-text-subtle">
        Auto-refreshes every 60 seconds · subscribe for incident email updates
      </footer>
    </div>
  );
}
