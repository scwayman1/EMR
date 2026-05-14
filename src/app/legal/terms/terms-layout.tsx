"use client";

// EMR-555 — sticky-TOC + scroll-spy + print-friendly layout for /terms.
// Renders a two-column grid on desktop (sticky TOC rail left, content right)
// and stacks on mobile. IntersectionObserver tracks the active section so
// the TOC stays in sync as the user scrolls. Print styles collapse the
// chrome (TOC, "back to top") so the printed page reads as a clean document.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export interface TermsSectionEntry {
  id: string;
  title: string;
}

interface Props {
  sections: TermsSectionEntry[];
  children: ReactNode;
}

export function TermsLayout({ sections, children }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Observe section headings — fire on the topmost visible one.
    const visible = new Map<string, IntersectionObserverEntry>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e);
          else visible.delete(e.target.id);
        }
        // Pick the section closest to the top of the viewport.
        let topId: string | null = null;
        let topY = Infinity;
        for (const [id, e] of visible) {
          const y = e.boundingClientRect.top;
          if (y >= 0 && y < topY) {
            topY = y;
            topId = id;
          }
        }
        if (topId) setActiveId(topId);
      },
      // Bias toward sections in the top third of the viewport so the active
      // pill flips before the section title hits the very top of the screen.
      { rootMargin: "-15% 0% -65% 0%", threshold: [0, 0.25, 0.5, 1] },
    );
    observerRef.current = obs;
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [sections]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-10 lg:gap-12">
      {/* Sticky TOC (left rail) */}
      <aside className="lg:sticky lg:top-24 lg:self-start print:hidden" aria-label="Table of contents">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)] mb-3">
          On this page
        </p>
        <nav>
          <ol className="space-y-1">
            {sections.map((s) => {
              const active = s.id === activeId;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`block text-[12.5px] leading-snug py-1.5 pl-3 border-l-2 transition-colors ${
                      active
                        ? "border-[var(--leaf,#2d8b5e)] text-[var(--ink)] font-medium"
                        : "border-transparent text-[var(--text-soft)] hover:text-[var(--ink)] hover:border-[var(--border)]"
                    }`}
                    aria-current={active ? "location" : undefined}
                  >
                    {s.title}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="mt-6 pt-4 border-t border-[var(--border)] print:hidden">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="text-[12px] font-medium text-[var(--leaf,#2d8b5e)] hover:underline"
          >
            Print these terms
          </button>
        </div>
      </aside>

      <div>{children}</div>
    </div>
  );
}

interface BackToTopProps {
  className?: string;
}

export function BackToTop({ className }: BackToTopProps) {
  return (
    <a
      href="#terms-top"
      className={`inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-subtle)] hover:text-[var(--leaf,#2d8b5e)] print:hidden ${className ?? ""}`}
    >
      <span aria-hidden="true">↑</span>
      Back to top
    </a>
  );
}

export default TermsLayout;
