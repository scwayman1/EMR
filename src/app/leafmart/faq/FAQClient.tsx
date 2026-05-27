"use client";

import { useEffect, useRef, useState } from "react";
import type { FaqItemData } from "./faq-items";

function FAQItem({ item }: { item: FaqItemData }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setMaxH(contentRef.current.scrollHeight);
    } else {
      setMaxH(0);
    }
  }, [open]);

  return (
    <div id={item.id} className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`faq-${item.q.replace(/\s+/g, "-").toLowerCase()}`}
        className="w-full flex items-center justify-between py-5 sm:py-6 text-left group gap-4"
      >
        <h3 className="font-display text-[17px] sm:text-[20px] font-normal tracking-tight text-[var(--ink)] group-hover:text-[var(--leaf)] transition-colors">
          {item.q}
        </h3>
        <span
          aria-hidden="true"
          className="text-[var(--muted)] text-2xl flex-shrink-0 leading-none transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
        >
          +
        </span>
      </button>
      <div
        id={`faq-${item.q.replace(/\s+/g, "-").toLowerCase()}`}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open ? maxH : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="pb-5 sm:pb-6 text-[14.5px] sm:text-[15px] text-[var(--text-soft)] leading-relaxed max-w-[720px] pr-4">
          {item.a}
        </div>
      </div>
    </div>
  );
}

export function FAQList({ items }: { items: FaqItemData[] }) {
  return (
    <>
      {items.map((item) => (
        <FAQItem key={item.q} item={item} />
      ))}
    </>
  );
}
