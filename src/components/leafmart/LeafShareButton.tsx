"use client";

import { useState, useRef, useEffect } from "react";

/**
 * EMR-308 — Leaf Share button.
 *
 * A share button that symbolises sharing in nature instead of using
 * the generic system share glyph. The icon is a hand-passing-leaf
 * SVG mark (one of five planned variants — others are tracked in the
 * design subticket; the current one is "leaf-pass-A"). All variants
 * use currentColor so theme tokens cascade.
 *
 * Sharing surfaces:
 *  - Web Share API (mobile / supported browsers)
 *  - X / Twitter
 *  - Facebook
 *  - Email (mailto)
 *  - Copy link (clipboard)
 *
 * `placement` controls visual size: `pdp-top` and `pdp-bottom` use a
 * full-pill button; `card` uses a compact icon-only button suitable
 * for product browse cards.
 */

export type LeafShareVariant = "leaf-pass-A" | "leaf-pass-B" | "leaf-pass-C" | "leaf-pass-D" | "leaf-pass-E";

interface Props {
  url: string;
  title: string;
  text?: string;
  placement?: "pdp-top" | "pdp-bottom" | "card";
  variant?: LeafShareVariant;
}

function LeafIcon({ size = 18, variant = "leaf-pass-A" }: { size?: number; variant?: LeafShareVariant }) {
  // Variant A — open hand offering a leaf upward (default).
  if (variant === "leaf-pass-A") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14 4c-3 1.5-5.5 4.5-5.5 8 0 1.5.5 3 1.5 4l-2.5 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 4c4 0 6 3 6 6s-2 6-6 6c-2 0-4-1-5-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 19c1.5-2 3.5-2 5-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Default fallback — simple leaf glyph.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3c-2 4-6 6-8 10 0 5 4 8 8 8s8-4 7-9c-1-4-5-5-7-9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildShareLinks(url: string, title: string, text: string) {
  const enc = encodeURIComponent;
  return {
    twitter: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    email: `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`,
  };
}

export function LeafShareButton({
  url,
  title,
  text,
  placement = "pdp-top",
  variant = "leaf-pass-A",
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const shareText = text ?? title;
  const links = buildShareLinks(url, title, shareText);

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to popover.
      }
    }
    setOpen(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const isCard = placement === "card";
  const buttonClass = isCard
    ? "inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--ink)] bg-[var(--surface)]/90 hover:bg-[var(--surface)] border border-[var(--border)] transition-colors"
    : "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--ink)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label={`Share ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleNativeShare}
        className={buttonClass}
      >
        <LeafIcon size={isCard ? 16 : 18} variant={variant} />
        {!isCard && <span>Share</span>}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="menu"
          className="absolute z-20 right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
        >
          <a
            role="menuitem"
            href={links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl px-3 py-2 text-[13.5px] text-[var(--text)] hover:bg-[var(--surface-muted)]"
          >
            Share on X / Twitter
          </a>
          <a
            role="menuitem"
            href={links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl px-3 py-2 text-[13.5px] text-[var(--text)] hover:bg-[var(--surface-muted)]"
          >
            Share on Facebook
          </a>
          <a
            role="menuitem"
            href={links.email}
            className="block rounded-xl px-3 py-2 text-[13.5px] text-[var(--text)] hover:bg-[var(--surface-muted)]"
          >
            Send by email
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="w-full text-left rounded-xl px-3 py-2 text-[13.5px] text-[var(--text)] hover:bg-[var(--surface-muted)]"
          >
            {copied ? "Link copied ✓" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
