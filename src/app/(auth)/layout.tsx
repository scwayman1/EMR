import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <nav className="max-w-[1200px] mx-auto w-full flex items-center justify-between px-6 lg:px-10 h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center text-white font-semibold text-sm">
            LJ
          </div>
          <span className="text-base font-semibold text-text tracking-tight">
            Leafjourney
          </span>
        </Link>
      </nav>
      <main className="flex-1 flex items-start justify-center px-6 pt-10 pb-20">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
