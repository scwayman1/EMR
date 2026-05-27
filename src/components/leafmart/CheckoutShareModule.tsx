"use client";

// EMR-310 — Share module for the checkout flow.
//
// Lets a customer share their cart with a friend or family member —
// useful for gift-cart / co-purchase flows. The share link encodes the
// cart contents into a signed token (see `lib/marketplace/share.ts`)
// so the recipient lands on /leafmart/cart with the items pre-loaded.
//
// We don't post anywhere; the encoding happens via a server endpoint
// that holds the HMAC secret. The component just orchestrates UX:
// click → fetch token → copy to clipboard → confirm.

import { useState, useCallback } from "react";

interface Props {
  cartItems: Array<{ slug: string; quantity: number }>;
  /** Sender display name, used in the share preview text. */
  fromName?: string;
}

export function CheckoutShareModule({ cartItems, fromName }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leafmart/cart/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: cartItems, from: fromName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data?.error ?? "Could not create share link.");
        return;
      }
      setShareUrl(data.url);
    } finally {
      setLoading(false);
    }
  }, [cartItems, fromName]);

  const copy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't access clipboard. Copy manually below.");
    }
  }, [shareUrl]);

  if (cartItems.length === 0) return null;

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 mt-4">
      <p className="eyebrow text-[var(--leaf)] mb-2">Send this cart</p>
      <h3 className="font-display text-[18px] font-medium text-[var(--ink)] mb-2">
        Share with someone
      </h3>
      <p className="text-[13px] text-[var(--text-soft)] leading-relaxed mb-4">
        Buying for a partner or parent? Send the cart and let them check out, or
        keep the link as a wishlist.
      </p>

      {!shareUrl ? (
        <button
          onClick={fetchUrl}
          disabled={loading}
          className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-5 py-2 text-[13px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-50"
        >
          {loading ? "Generating link…" : "Generate share link"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[12.5px] font-mono"
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
            <button
              onClick={copy}
              className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-[12.5px] font-medium hover:bg-[var(--leaf)] transition-colors whitespace-nowrap"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex gap-2">
            <a
              href={`mailto:?subject=${encodeURIComponent("My Leafmart cart")}&body=${encodeURIComponent(shareUrl)}`}
              className="text-[12.5px] text-[var(--leaf)] hover:underline"
            >
              Email link
            </a>
            <span className="text-[var(--muted)]">·</span>
            <a
              href={`sms:?&body=${encodeURIComponent(shareUrl)}`}
              className="text-[12.5px] text-[var(--leaf)] hover:underline"
            >
              Text link
            </a>
          </div>
          <p className="text-[11.5px] text-[var(--muted)]">
            Anyone with the link can load this cart. The link is signed and
            tamper-resistant.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-rose-700 mt-3">{error}</p>
      )}
    </section>
  );
}
