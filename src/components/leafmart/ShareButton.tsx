"use client";

// EMR-308 — Nature/leaf share button.
//
// Drop-in share affordance that picks the right behaviour for the
// device: native share sheet on touch devices, a small popover with
// the usual destinations on desktop. The button itself is a leaf-shape
// SVG so it reads as part of the Leafmart brand rather than a generic
// share glyph.
//
// Examples:
//   <ShareButton title="…" url="…" />
//   <ShareButton title="…" url="…" variant="pill" />

import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  url: string;
  text?: string;
  /** "icon" (default) renders a circular leaf, "pill" adds a "Share" label. */
  variant?: "icon" | "pill";
  className?: string;
}

interface Destination {
  id: string;
  label: string;
  build: (ctx: { url: string; title: string; text?: string }) => string;
}

const DESTINATIONS: Destination[] = [
  {
    id: "twitter",
    label: "X / Twitter",
    build: ({ url, title }) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    build: ({ url }) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "email",
    label: "Email",
    build: ({ url, title, text }) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        `${text ?? title}\n\n${url}`
      )}`,
  },
  {
    id: "sms",
    label: "Text message",
    build: ({ url, title }) =>
      `sms:?&body=${encodeURIComponent(`${title} — ${url}`)}`,
  },
];

export function ShareButton({
  title,
  url,
  text,
  variant = "icon",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Fall through to popover on cancel/error.
      }
    }
    setOpen((v) => !v);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — leave the button in its idle state.
    }
  };

  const buttonClass =
    variant === "pill"
      ? "inline-flex items-center gap-2 rounded-full bg-[var(--surface)] border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors"
      : "inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--leaf)] hover:bg-[var(--leaf)] hover:text-[var(--bg)] transition-colors";

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-label="Share"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleClick}
        className={buttonClass}
      >
        <LeafShareIcon />
        {variant === "pill" && <span>Share</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share this product"
          className="absolute right-0 mt-2 w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl p-2 z-50"
        >
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)]"
          >
            <span>Copy link</span>
            <span className="text-[11.5px] text-[var(--leaf)] font-medium">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
          <div className="my-1 h-px bg-[var(--border)]" />
          <ul>
            {DESTINATIONS.map((d) => (
              <li key={d.id}>
                <a
                  href={d.build({ url, title, text })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-[var(--text-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
                >
                  {d.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Leaf-shape share icon. Two veined "shoots" pointing upward — meant
 * to read as a sprout rather than a generic arrow.
 */
function LeafShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21V11" />
      <path d="M12 11C12 7 9 5 5 5c0 4 2 7 7 6" />
      <path d="M12 11c0-4 3-6 7-6 0 4-2 7-7 6" />
      <path d="M9 21h6" />
    </svg>
  );
}
