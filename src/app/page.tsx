import Link from "next/link";
import { Button } from "@/components/ui/button";

// Public marketing / acquisition home page. Deliberately distinct from the
// authenticated app shell — no nav chrome, generous whitespace, premium tone.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Top nav */}
      <nav className="max-w-[1200px] mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center text-white font-semibold text-sm">
            LJ
          </div>
          <span className="text-base font-semibold text-text tracking-tight">
            Leafjourney
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-text px-3 py-2"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Start your care</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-16 pb-24">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent mb-5">
            Modern cannabis medicine
          </p>
          <h1 className="text-4xl md:text-[56px] leading-[1.05] font-semibold text-text tracking-tight">
            A calm, modern home for your care.
          </h1>
          <p className="text-lg text-text-muted mt-6 max-w-2xl leading-relaxed">
            One place to meet your care team, track how you're feeling, message
            securely, and see your plan. Built for patients and clinicians who
            expect software to feel like the rest of their lives.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link href="/signup">
              <Button size="lg">Create your account</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust panels */}
      <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Your records in one place",
              body: "Upload notes, labs, and letters. We organize them so your care team is ready for your first visit.",
            },
            {
              title: "Symptoms you can track",
              body: "Short, fast check-ins that build a real picture of how things are going — not a static form in a folder.",
            },
            {
              title: "A care team that responds",
              body: "Secure messaging keeps everything in one thread. No phone tag. No portal maze.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-surface rounded-lg border border-border p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-text">{item.title}</h3>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-xs text-text-subtle">
            &copy; {new Date().getFullYear()} Leafjourney. All rights reserved.
          </p>
          <p className="text-xs text-text-subtle">
            This platform is a demonstration product and is not a substitute for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
