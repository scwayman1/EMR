"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  type CommunityCategory,
  type CommunityPost,
} from "@/lib/domain/journal-community";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | CommunityCategory;

const FILTERS: Array<{ key: Filter; label: string; emoji?: string }> = [
  { key: "all", label: "All" },
  { key: "sleep", label: CATEGORY_LABELS.sleep.label, emoji: CATEGORY_LABELS.sleep.emoji },
  { key: "pain", label: CATEGORY_LABELS.pain.label, emoji: CATEGORY_LABELS.pain.emoji },
  { key: "anxiety", label: CATEGORY_LABELS.anxiety.label, emoji: CATEGORY_LABELS.anxiety.emoji },
  { key: "general", label: CATEGORY_LABELS.general.label, emoji: CATEGORY_LABELS.general.emoji },
  { key: "product_share", label: CATEGORY_LABELS.product_share.label, emoji: CATEGORY_LABELS.product_share.emoji },
  { key: "support", label: CATEGORY_LABELS.support.label, emoji: CATEGORY_LABELS.support.emoji },
];

const MAX_LEN = 500;

interface DemoReply {
  id: string;
  handle: string;
  body: string;
  createdAt: string;
  isClinician?: boolean;
}

const DEMO_REPLIES: Record<string, DemoReply[]> = {
  "c-1": [
    {
      id: "r-1",
      handle: "Care team · NP Jordan Lee",
      body: "Glad to hear it's working. Timing absolutely matters — most patients see best results 30–60 min before bed. Keep us posted at your next visit.",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isClinician: true,
    },
    {
      id: "r-2",
      handle: "Sage Orchard #412",
      body: "Same here — 45 minutes before bed is my sweet spot.",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
  ],
};

export function CommunityView({
  initialPosts,
  myHandle,
}: {
  initialPosts: CommunityPost[];
  myHandle: string;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [filter, setFilter] = useState<Filter>("all");
  const [supportedIds, setSupportedIds] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState<CommunityCategory>("general");
  const [draftBody, setDraftBody] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => p.category === filter)),
    [posts, filter],
  );

  function toggleSupport(id: string) {
    setSupportedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, supportCount: p.supportCount + (supportedIds.has(id) ? -1 : 1) }
          : p,
      ),
    );
  }

  function submitPost() {
    const body = draftBody.trim();
    if (!body) return;
    const newPost: CommunityPost = {
      id: `c-${Date.now()}`,
      anonymousHandle: myHandle,
      category: draftCategory,
      body,
      supportCount: 0,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      isClinicianReplied: false,
    };
    setPosts((prev) => [newPost, ...prev]);
    setComposeOpen(false);
    setDraftBody("");
    setDraftCategory("general");
  }

  const openThread = posts.find((p) => p.id === openThreadId);
  const openReplies = openThreadId ? DEMO_REPLIES[openThreadId] ?? [] : [];

  return (
    <div className="space-y-6">
      {/* Privacy banner */}
      <Card tone="ambient">
        <CardContent className="py-4 flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5">🛡️</span>
          <p className="text-sm text-text leading-relaxed">
            Your identity is never shared. Posts are moderated for safety and warmth.
            You appear here as{" "}
            <span className="font-medium text-emerald-700">{myHandle}</span>.
          </p>
        </CardContent>
      </Card>

      {/* Filter pills + new */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                active
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-surface text-text-muted border-border hover:bg-surface-muted",
              )}
            >
              {f.emoji && <span>{f.emoji}</span>}
              {f.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <Button onClick={() => setComposeOpen((v) => !v)} size="sm">
            {composeOpen ? "Cancel" : "+ New post"}
          </Button>
        </div>
      </div>

      {/* Compose */}
      {composeOpen && (
        <Card tone="raised">
          <CardContent className="py-5 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-text-subtle mb-2 block">
                Pick a category
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTERS.filter((f) => f.key !== "all").map((f) => {
                  const active = draftCategory === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setDraftCategory(f.key as CommunityCategory)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        active
                          ? "bg-emerald-50 border-emerald-700 text-emerald-700"
                          : "bg-surface border-border text-text-muted hover:bg-surface-muted",
                      )}
                    >
                      <span>{f.emoji}</span>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value.slice(0, MAX_LEN))}
              placeholder="Share what's on your mind. Be kind — others read this too."
              rows={4}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p
                className={cn(
                  "text-[11px] tabular-nums",
                  draftBody.length > MAX_LEN - 50 ? "text-amber-600" : "text-text-subtle",
                )}
              >
                {draftBody.length} / {MAX_LEN}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Posting as</span>
                <Badge tone="accent" className="text-[10px]">{myHandle}</Badge>
                <Button onClick={submitPost} size="sm" disabled={!draftBody.trim()}>
                  Post anonymously
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card tone="outlined">
            <CardContent className="py-10 text-center text-sm text-text-muted">
              No posts in this category yet. Be the first to share.
            </CardContent>
          </Card>
        )}
        {filtered.map((post) => {
          const cat = CATEGORY_LABELS[post.category];
          const supported = supportedIds.has(post.id);
          return (
            <Card
              key={post.id}
              tone="default"
              className="hover:border-emerald-200 transition-colors cursor-pointer"
              onClick={() => setOpenThreadId(post.id)}
            >
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge tone="neutral" className="text-[10px]">
                    <span className="mr-1">{cat.emoji}</span>
                    {cat.label}
                  </Badge>
                  <span className="text-xs font-medium text-text">{post.anonymousHandle}</span>
                  <span className="text-text-subtle">·</span>
                  <span className="text-xs text-text-subtle">{formatRelative(post.createdAt)}</span>
                  {post.isClinicianReplied && (
                    <Badge tone="accent" className="text-[10px]">
                      ✓ Clinician replied
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                  {post.body}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSupport(post.id);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors",
                      supported
                        ? "bg-rose-50 text-rose-600"
                        : "text-text-muted hover:bg-surface-muted",
                    )}
                  >
                    <span>{supported ? "❤️" : "🤍"}</span>
                    <span className="tabular-nums">{post.supportCount}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    <span>💬</span>
                    <span className="tabular-nums">{post.replyCount}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Thread modal */}
      {openThread && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setOpenThreadId(null)}
        >
          <Card
            tone="raised"
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="neutral" className="text-[10px]">
                  <span className="mr-1">{CATEGORY_LABELS[openThread.category].emoji}</span>
                  {CATEGORY_LABELS[openThread.category].label}
                </Badge>
                <span className="text-xs font-medium text-text">{openThread.anonymousHandle}</span>
                <span className="text-text-subtle">·</span>
                <span className="text-xs text-text-subtle">
                  {formatRelative(openThread.createdAt)}
                </span>
              </div>
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {openThread.body}
              </p>
              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wider text-text-subtle mb-3">
                  Replies
                </p>
                {openReplies.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    Be the first to reply with kindness.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {openReplies.map((r) => (
                      <div key={r.id} className="rounded-lg bg-surface-muted/50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              r.isClinician ? "text-emerald-700" : "text-text",
                            )}
                          >
                            {r.handle}
                          </span>
                          <span className="text-text-subtle">·</span>
                          <span className="text-[11px] text-text-subtle">
                            {formatRelative(r.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-text leading-relaxed">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setOpenThreadId(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
