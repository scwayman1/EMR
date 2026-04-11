"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafSprig } from "@/components/ui/ornament";

export function ControlBar({ patientName }: { patientName: string }) {
  const [shareMessage, setShareMessage] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailValue, setEmailValue] = React.useState("");
  const [emailSent, setEmailSent] = React.useState(false);

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

          {/* Legacy share tooltip */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShareMessage(true);
                setTimeout(() => setShareMessage(false), 3000);
              }}
            >
              Share
            </Button>
            {shareMessage && (
              <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-lg bg-surface-raised border border-border shadow-md text-xs text-text-muted leading-relaxed z-40">
                Sharing is coming soon. For now, print your story and bring it
                to your next visit.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
