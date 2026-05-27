"use client";

// EMR-308 — Share button. Click opens the ShareDialog. Falls back to the
// native Web Share API (when available) on mobile and to the dialog
// everywhere else.

import { useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ShareDialog } from "./ShareDialog";
import type { SharePayload } from "./types";

interface ShareButtonProps {
  payload: SharePayload;
  /** Visual variant — "icon" for compact, "pill" for full button. */
  variant?: "icon" | "pill";
  className?: string;
}

export function ShareButton({
  payload,
  variant = "pill",
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  const buttonClass =
    variant === "icon"
      ? "h-10 w-10 rounded-full bg-white border border-slate-200 hover:border-accent flex items-center justify-center transition-all shadow-sm"
      : "inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-slate-200 hover:border-accent text-sm font-semibold text-text transition-all shadow-sm";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share"
        className={cn(buttonClass, className)}
      >
        <Share2 className="w-4 h-4" />
        {variant === "pill" && <span>Share</span>}
      </button>
      {open && <ShareDialog payload={payload} onClose={() => setOpen(false)} />}
    </>
  );
}
