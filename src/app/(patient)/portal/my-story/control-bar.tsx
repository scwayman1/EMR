"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";

export function ControlBar({ patientName }: { patientName: string }) {
  const [shareMessage, setShareMessage] = React.useState(false);

  return (
    <div className="print:hidden bg-surface border-b border-border/60 sticky top-0 z-30">
      <div className="max-w-[700px] mx-auto px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <LeafSprig size={20} className="text-accent shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-text truncate">
              {patientName}&apos;s Story
            </h1>
            <p className="text-xs text-text-muted leading-relaxed">
              Your care story, formatted as a book you can print, share, or
              keep.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 relative">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
          >
            Print this story
          </Button>
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShareMessage(true);
                setTimeout(() => setShareMessage(false), 3000);
              }}
            >
              Share with your doctor
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
