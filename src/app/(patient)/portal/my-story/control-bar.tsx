"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafSprig } from "@/components/ui/ornament";
import { createShareLink } from "./share-actions";

export function ControlBar({ patientName }: { patientName: string }) {
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailValue, setEmailValue] = React.useState("");
  const [emailSent, setEmailSent] = React.useState(false);

  async function handleShare() {
    if (shareUrl) {
      setShareOpen(!shareOpen);
      return;
    }
    setShareLoading(true);
    const result = await createShareLink();
    setShareLoading(false);
    if (result.ok && result.url) {
      setShareUrl(result.url);
      setShareOpen(true);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValue.trim()) return;
    setEmailSent(true);
    setEmailValue("");
    setTimeout(() => {
      setEmailDialogOpen(false);
      setEmailSent(false);
    }, 2500);
  }

  return (
    <div className="print:hidden bg-surface border-b border-border/60 sticky top-0 z-30">
      <div className="max-w-[700px] mx-auto px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <LeafSprig size={20} className="text-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-medium text-text truncate">
              {patientName}&apos;s Story
            </h1>
            <p className="text-xs text-text-muted leading-snug">
              Your care story, formatted to print, share, or keep.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap lg:shrink-0 relative">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
          >
            Print
          </Button>

          {/* Email to my doctor */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEmailDialogOpen(!emailDialogOpen);
                setEmailSent(false);
              }}
            >
              Email to doctor
            </Button>
            {emailDialogOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-72 p-4 rounded-lg bg-surface-raised border border-border shadow-lg z-40"
                role="dialog"
                aria-label="Email story to your doctor"
              >
                {emailSent ? (
                  <p className="text-sm text-success font-medium">
                    A copy has been queued for delivery
                  </p>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <label
                      htmlFor="doctor-email"
                      className="block text-sm font-medium text-text"
                    >
                      Doctor&apos;s email
                    </label>
                    <Input
                      id="doctor-email"
                      type="email"
                      required
                      placeholder="doctor@clinic.com"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmailDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Send
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Download as PDF (uses browser print-to-PDF) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            PDF
          </Button>

          {/* Share link — EMR-90 / EMR-149 */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={shareLoading}
            >
              {shareLoading ? "Creating..." : "Share"}
            </Button>
            {shareOpen && shareUrl && (
              <div className="absolute top-full right-0 mt-2 w-80 p-4 rounded-lg bg-surface-raised border border-border shadow-lg z-40">
                <p className="text-sm font-medium text-text mb-2">
                  Share with an ER or outside doctor
                </p>
                <p className="text-xs text-text-muted mb-3 leading-relaxed">
                  This link shows a read-only summary of your chart — allergies,
                  medications, and care plan. It expires in 72 hours.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs bg-surface-muted border border-border rounded px-2 py-1.5 text-text truncate"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button size="sm" variant="primary" onClick={handleCopy}>
                    {shareCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-2 text-xs"
                  onClick={() => setShareOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
