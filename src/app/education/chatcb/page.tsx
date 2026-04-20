import Link from "next/link";
import type { Metadata } from "next";
import ChatCBUI from "@/components/chatcb/ChatCBUI";
import { Wordmark } from "@/components/ui/logo";

/**
 * ChatCB — the cannabis industry's conversational research engine.
 *
 * Public-facing, no login required. v0 scaffold: welcome message, chat UI,
 * one server action that calls the configured AI client. PubMed integration,
 * structured citations, and evidence classification all land in later tickets.
 */

export const metadata: Metadata = {
  title: "ChatCB — Medical cannabis research, on tap",
  description:
    "Conversational AI search for medical cannabis. Cites research, flags evidence strength, and explains in plain language. Free and open — no login required.",
};

export default function ChatCBPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Minimal nav ─────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 lg:px-12 h-16 border-b border-slate-200">
        <Link href="/" className="flex items-center">
          <Wordmark size="sm" />
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/education"
            className="px-3 py-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            Education
          </Link>
          <span className="px-3 py-2 font-medium text-emerald-700">ChatCB</span>
          <Link
            href="/store"
            className="px-3 py-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            Store
          </Link>
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────────── */}
      <header className="px-6 lg:px-12 pt-6 pb-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-medium">
          ChatCB · v0 preview
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-slate-900 tracking-tight mt-2">
          Medical cannabis research, on tap.
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-2 max-w-xl mx-auto">
          A conversational assistant for cannabinoids, conditions, and interactions.
        </p>
      </header>

      {/* ── Chat ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <ChatCBUI />
      </main>
    </div>
  );
}
