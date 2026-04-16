"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export type FeedbackStatus = "new" | "in_progress" | "resolved";
export type FeedbackTag = "reviewed" | "action_taken" | "not_actionable";

export interface FeedbackItem {
  id: string;
  patientName: string;
  rating: number; // 0-10 NPS-style
  excerpt: string;
  submittedAt: string;
  status: FeedbackStatus;
  tag?: FeedbackTag;
  responseDraft?: string;
}

const TABS: Array<{ key: "all" | FeedbackStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
];

const TAG_LABELS: Record<FeedbackTag, string> = {
  reviewed: "Reviewed",
  action_taken: "Action taken",
  not_actionable: "Not actionable",
};

function ratingTone(r: number): "danger" | "warning" | "success" {
  if (r < 7) return "danger";
  if (r < 9) return "warning";
  return "success";
}

export function FeedbackView({ initialFeedback }: { initialFeedback: FeedbackItem[] }) {
  const [items, setItems] = useState<FeedbackItem[]>(initialFeedback);
  const [tab, setTab] = useState<"all" | FeedbackStatus>("all");
  const [responding, setResponding] = useState<FeedbackItem | null>(null);
  const [responseText, setResponseText] = useState("");

  const sorted = useMemo(() => {
    const filtered = tab === "all" ? items : items.filter((i) => i.status === tab);
    return [...filtered].sort((a, b) => {
      // Promote negative NPS first
      const aNeg = a.rating < 7 ? 0 : 1;
      const bNeg = b.rating < 7 ? 0 : 1;
      if (aNeg !== bNeg) return aNeg - bNeg;
      return b.submittedAt.localeCompare(a.submittedAt);
    });
  }, [items, tab]);

  function draftReply(f: FeedbackItem) {
    const template =
      f.rating < 7
        ? `Hi ${f.patientName === "Anonymous" ? "there" : f.patientName.split(" ")[0]},\n\nThank you for sharing this — I'm sorry to hear the experience fell short. I'd like to understand what happened and make it right. Could we schedule a quick call this week?\n\n— Leafjourney Care Team`
        : `Hi ${f.patientName === "Anonymous" ? "there" : f.patientName.split(" ")[0]},\n\nThank you so much for this kind note! It means a lot to the whole team. Please keep telling us what's working so we can do more of it.\n\n— Leafjourney Care Team`;
    setResponding(f);
    setResponseText(template);
  }

  function saveResponse() {
    if (!responding) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === responding.id
          ? { ...i, responseDraft: responseText, status: i.status === "new" ? "in_progress" : i.status }
          : i,
      ),
    );
    setResponding(null);
    setResponseText("");
  }

  function setTag(id: string, tag: FeedbackTag) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              tag,
              status: tag === "action_taken" || tag === "not_actionable" ? "resolved" : i.status,
            }
          : i,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => {
          const count = t.key === "all" ? items.length : items.filter((i) => i.status === t.key).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-surface text-text-muted border-border hover:bg-surface-muted",
              )}
            >
              {t.label}
              <span className={cn("ml-2 tabular-nums", active ? "text-white/80" : "text-text-subtle")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((f) => {
          const isNegative = f.rating < 7;
          return (
            <Card
              key={f.id}
              tone="raised"
              className={cn(isNegative && "border-red-300/70 ring-1 ring-red-200")}
            >
              <CardContent className="py-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{f.patientName}</p>
                    <p className="text-[11px] text-text-subtle">
                      {new Date(f.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge tone={ratingTone(f.rating)}>NPS {f.rating}/10</Badge>
                </div>
                <p className="text-sm text-text-muted">&ldquo;{f.excerpt}&rdquo;</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={f.status === "resolved" ? "success" : f.status === "in_progress" ? "warning" : "neutral"}>
                    {f.status.replace("_", " ")}
                  </Badge>
                  {f.tag && <Badge tone="accent">{TAG_LABELS[f.tag]}</Badge>}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => draftReply(f)}>
                    Respond
                  </Button>
                  <select
                    value={f.tag ?? ""}
                    onChange={(e) => {
                      const val = e.target.value as FeedbackTag | "";
                      if (val) setTag(f.id, val);
                    }}
                    className="rounded-md border border-border-strong bg-surface px-2 h-8 text-xs text-text-muted"
                  >
                    <option value="">Tag…</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="action_taken">Action taken</option>
                    <option value="not_actionable">Not actionable</option>
                  </select>
                </div>
                {f.responseDraft && (
                  <details className="mt-1">
                    <summary className="text-[11px] text-text-subtle cursor-pointer">
                      Draft reply saved
                    </summary>
                    <p className="mt-2 text-xs text-text-muted whitespace-pre-line">{f.responseDraft}</p>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {responding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setResponding(null)}
        >
          <Card tone="raised" className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="py-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-subtle mb-1">Respond</p>
                <h3 className="font-display text-lg text-text">{responding.patientName}</h3>
                <p className="text-xs text-text-muted mt-1">NPS {responding.rating}/10</p>
              </div>
              <Textarea
                rows={8}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setResponding(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveResponse}>
                  Save draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
