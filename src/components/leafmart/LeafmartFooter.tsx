"use client";

import Link from "next/link";
import { useState } from "react";

const COLUMNS = [
  { title: "Shelves", links: [
    { label: "Rest", href: "/leafmart/category/rest" },
    { label: "RELIEF", href: "/leafmart/category/relief" },
    { label: "Calm", href: "/leafmart/category/calm" },
    { label: "Skin", href: "/leafmart/category/skin" },
    { label: "Focus", href: "/leafmart/category/focus" },
  ]},
  { title: "About", links: [
    { label: "The Method", href: "/leafmart/about" },
    { label: "Vendors", href: "/leafmart/vendors" },
    { label: "Field Notes", href: "/leafmart/about#field-notes" },
    { label: "Careers", href: "/leafmart/about#careers" },
  ]},
  { title: "Help", links: [
    { label: "FAQ", href: "/leafmart/faq" },
    { label: "Shipping", href: "/legal/shipping" },
    { label: "Returns", href: "/legal/returns" },
    { label: "Contact", href: "/leafmart/faq#contact" },
  ]},
  { title: "Legal", links: [
    { label: "Terms", href: "/legal/terms" },
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Disputes", href: "/legal/disputes" },
    { label: "21+ Notice", href: "/leafmart/faq#age" },
  ]},
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)] sm:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-4 sm:py-0 sm:cursor-default sm:pointer-events-none text-left"
      >
        <span className="text-[12.5px] font-semibold tracking-[1.2px] uppercase text-[var(--ink)] sm:mb-3.5 block">
          {title}
        </span>
        <span
          aria-hidden="true"
          className="sm:hidden text-[var(--muted)] text-2xl leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
        >
          +
        </span>
      </button>
      <ul
        className="overflow-hidden sm:!max-h-none sm:!opacity-100 sm:!visible sm:block space-y-2.5 sm:pb-0 transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open ? "300px" : "0px",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          paddingBottom: open ? "16px" : "0px",
        }}
      >
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-[var(--text-soft)] hover:text-[var(--text)] transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setStatus("error");
      setMessage("Enter a valid email");
      return;
    }
    setStatus("submitting");
    // No backend yet — simulate the receipt so the UX is honest about latency
    await new Promise((r) => setTimeout(r, 400));
    setStatus("success");
    setMessage("You're on the list. Watch your inbox.");
    setEmail("");
  }

  return (
    <div className="mb-8 sm:mb-10 max-w-[460px]">
      <h3 className="font-display text-[20px] font-medium tracking-tight text-[var(--ink)] mb-2">
        Stay in the loop
      </h3>
      <p className="text-[13.5px] text-[var(--text-soft)] mb-4 leading-relaxed">
        New products, dosing tips, and the occasional field note. No filler.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2" noValidate>
        <label htmlFor="leafmart-newsletter-email" className="sr-only">Email address</label>
        <input
          id="leafmart-newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") setStatus("idle");
            if (message) setMessage(null);
          }}
          placeholder="you@email.com"
          aria-invalid={status === "error"}
          aria-describedby={message ? "leafmart-newsletter-msg" : undefined}
          required
          className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--leaf)] focus:ring-1 focus:ring-[var(--leaf)] outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 text-[13px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Joining…" : "Join"}
        </button>
      </form>
      {message && (
        <p
          id="leafmart-newsletter-msg"
          role={status === "error" ? "alert" : "status"}
          className={`mt-2 text-[12.5px] ${status === "error" ? "text-[var(--danger)]" : "text-[var(--leaf)]"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors inline-flex items-center gap-1"
    >
      <span aria-hidden="true">↑</span> Back to top
    </button>
  );
}

export function LeafmartFooter() {
  return (
    <footer className="border-t border-[var(--border)]" role="contentinfo">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14 py-10 sm:py-12">
        {/* Top: brand + newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 sm:mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="15" fill="var(--leaf)" />
                <path d="M11 17.5 L14.5 21 L21.5 12.5" stroke="#F5E6B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="font-display text-[22px] font-medium tracking-tight">Leafmart</span>
            </div>
            <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed max-w-[320px]">
              A clinician-curated cannabis wellness marketplace. From Leafjourney Health.
            </p>
          </div>
          <NewsletterSignup />
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2 sm:gap-y-8 mb-8 sm:mb-10">
          {COLUMNS.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span>&copy; {new Date().getFullYear()} Leafmart, from Leafjourney Health.</span>
            <BackToTop />
          </div>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
            <span>Hemp-derived products ship nationally where permitted.</span>
            <span>Licensed cannabis available intrastate only.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
