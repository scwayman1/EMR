import Link from "next/link";
import { requireUser } from "@/lib/auth/session";

export default async function SignOffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]">
      {/* Left split-pane (sidebar navigation) */}
      <div className="w-64 shrink-0 border-r border-border bg-surface flex flex-col p-4">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-4 px-2">Sign-Off Queues</h2>
        <nav className="flex flex-col gap-1">
          <Link href="/clinic/sign-off" className="px-3 py-2 rounded-md text-sm font-medium text-text hover:bg-surface-muted transition-colors">
            Unified Queue (All)
          </Link>
          <Link href="/clinic/sign-off/labs" className="px-3 py-2 rounded-md text-sm font-medium text-text hover:bg-surface-muted transition-colors">
            Labs
          </Link>
          <Link href="/clinic/sign-off/refills" className="px-3 py-2 rounded-md text-sm font-medium text-text hover:bg-surface-muted transition-colors">
            Refills
          </Link>
          <Link href="/clinic/sign-off/notes" className="px-3 py-2 rounded-md text-sm font-medium text-text hover:bg-surface-muted transition-colors">
            Clinical Notes
          </Link>
          <Link href="/clinic/sign-off/messages" className="px-3 py-2 rounded-md text-sm font-medium text-text hover:bg-surface-muted transition-colors">
            Messages (Approvals)
          </Link>
        </nav>
      </div>
      
      {/* Right split-pane (content) */}
      <div className="flex-1 min-w-0 bg-surface-raised overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
