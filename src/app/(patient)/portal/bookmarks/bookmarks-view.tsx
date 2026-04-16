"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readBookmarks,
  toggleBookmark,
  type Bookmark,
  type BookmarkKind,
} from "@/components/ui/bookmark-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

const KIND_META: Record<BookmarkKind, { label: string; emoji: string }> = {
  product: { label: "Products", emoji: "🌿" },
  note: { label: "Notes", emoji: "📝" },
  tip: { label: "Tips", emoji: "💡" },
  article: { label: "Articles", emoji: "📰" },
  other: { label: "Other", emoji: "🔖" },
};

const KIND_ORDER: BookmarkKind[] = ["product", "tip", "article", "note", "other"];

export function BookmarksView() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(readBookmarks());
    function onChange() {
      setItems(readBookmarks());
    }
    window.addEventListener("lj-bookmarks-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lj-bookmarks-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function remove(b: Bookmark) {
    toggleBookmark({
      id: b.id,
      kind: b.kind,
      title: b.title,
      href: b.href,
      summary: b.summary,
    });
  }

  if (!mounted) {
    return (
      <div className="text-sm text-text-subtle">Loading your bookmarks…</div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No bookmarks yet"
        description="Tap the heart icon on any product, tip, or article to save it here for quick access."
      />
    );
  }

  const grouped: Record<BookmarkKind, Bookmark[]> = {
    product: [],
    note: [],
    tip: [],
    article: [],
    other: [],
  };
  for (const b of items) {
    (grouped[b.kind] ?? grouped.other).push(b);
  }

  return (
    <div className="space-y-8">
      {KIND_ORDER.filter((k) => grouped[k].length > 0).map((kind) => {
        const meta = KIND_META[kind];
        return (
          <section key={kind}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl" aria-hidden="true">
                {meta.emoji}
              </span>
              <h2 className="font-display text-lg text-text tracking-tight">
                {meta.label}
              </h2>
              <Badge tone="neutral">{grouped[kind].length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped[kind]
                .slice()
                .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
                .map((b) => (
                  <Card key={`${b.kind}:${b.id}`} tone="raised">
                    <CardContent className="py-4 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        {b.href ? (
                          <Link
                            href={b.href}
                            className="font-medium text-text hover:text-accent line-clamp-2"
                          >
                            {b.title}
                          </Link>
                        ) : (
                          <p className="font-medium text-text line-clamp-2">
                            {b.title}
                          </p>
                        )}
                        {b.summary && (
                          <p className="text-xs text-text-muted mt-1 line-clamp-3">
                            {b.summary}
                          </p>
                        )}
                        <p className="text-[11px] text-text-subtle mt-1.5">
                          Saved {new Date(b.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(b)}
                        aria-label={`Remove ${b.title} from bookmarks`}
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-full flex items-center justify-center",
                          "text-text-subtle hover:text-danger hover:bg-surface-muted transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        )}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
