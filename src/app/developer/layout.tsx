import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

export const metadata = {
  title: "Developers — Leafjourney",
  description: "Build on the Leafjourney cannabis care platform.",
};

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Wordmark size="md" />
            </Link>
            <span className="text-xs font-mono text-accent uppercase tracking-wider">
              developers
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-text-muted">
            <Link href="/developer" className="hover:text-text">
              Home
            </Link>
            <Link href="/developer#quickstart" className="hover:text-text">
              Quickstart
            </Link>
            <Link href="/developer#webhooks" className="hover:text-text">
              Webhooks
            </Link>
            <Link href="/developer#auth" className="hover:text-text">
              Auth
            </Link>
            <Link
              href="/login"
              className="text-accent font-medium hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="font-display text-text mb-2">Platform</div>
            <ul className="space-y-1.5 text-text-muted">
              <li>
                <Link href="/" className="hover:text-text">Home</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-text">Pricing</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-text">About</Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-display text-text mb-2">Education</div>
            <ul className="space-y-1.5 text-text-muted">
              <li>
                <Link href="/education" className="hover:text-text">Education hub</Link>
              </li>
              <li>
                <Link href="/education/chatcb" className="hover:text-text">ChatCB</Link>
              </li>
              <li>
                <Link href="/education/research" className="hover:text-text">Research</Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-display text-text mb-2">Developers</div>
            <ul className="space-y-1.5 text-text-muted">
              <li><Link href="/developer" className="hover:text-text">Portal</Link></li>
              <li><Link href="/developer/docs" className="hover:text-text">API docs</Link></li>
              <li><Link href="/status" className="hover:text-text">Status</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-display text-text mb-2">Legal</div>
            <ul className="space-y-1.5 text-text-muted">
              <li><Link href="/security" className="hover:text-text">Security</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border text-xs text-text-subtle text-center py-4">
          © {new Date().getFullYear()} Leafjourney. Built for clinicians, patients, and developers.
        </div>
      </footer>
    </div>
  );
}
