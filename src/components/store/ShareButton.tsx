"use client";

// EMR-310 — Share button. Same behavior on the product page and at
// checkout: use the native Web Share sheet when available, fall back to
// copying the link to the clipboard with inline confirmation.

import * as React from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({
  title,
  text,
  url,
  variant = "secondary",
  size = "md",
  label = "Share",
  className,
}: {
  title: string;
  text?: string;
  /** Absolute or relative URL. Defaults to the current page. */
  url?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [shared, setShared] = React.useState(false);

  const resolveUrl = React.useCallback(() => {
    if (typeof window === "undefined") return url ?? "";
    if (!url) return window.location.href;
    return new URL(url, window.location.origin).toString();
  }, [url]);

  const onShare = React.useCallback(async () => {
    const shareUrl = resolveUrl();
    const nav = typeof navigator !== "undefined" ? navigator : undefined;

    if (nav?.share) {
      try {
        await nav.share({ title, text, url: shareUrl });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }

    try {
      await nav?.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing more we can do silently */
    }
  }, [resolveUrl, title, text]);

  const icon = shared ? <Check width={16} height={16} /> : copied ? <Copy width={16} height={16} /> : <Share2 width={16} height={16} />;
  const text2 = shared ? "Shared" : copied ? "Link copied" : label;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onShare}
      leadingIcon={icon}
      className={className}
      aria-label={`Share ${title}`}
    >
      {text2}
    </Button>
  );
}
