"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type BookmarkKind = "product" | "note" | "tip" | "article" | "other";

export interface Bookmark {
  id: string;
  kind: BookmarkKind;
  title: string;
  href?: string;
  summary?: string;
  addedAt: string; // ISO
}

const STORAGE_KEY = "lj-bookmarks";

export function readBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b: unknown): b is Bookmark =>
        !!b &&
        typeof b === "object" &&
        typeof (b as Bookmark).id === "string" &&
        typeof (b as Bookmark).title === "string" &&
        typeof (b as Bookmark).kind === "string"
    );
  } catch {
    return [];
  }
}

function writeBookmarks(list: Bookmark[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Notify any other listeners (e.g. bookmarks page) in the same tab.
    window.dispatchEvent(new CustomEvent("lj-bookmarks-changed"));
  } catch {
    // ignore quota / private mode
  }
}

export function toggleBookmark(entry: Omit<Bookmark, "addedAt">): boolean {
  const list = readBookmarks();
  const exists = list.some((b) => b.id === entry.id && b.kind === entry.kind);
  if (exists) {
    writeBookmarks(list.filter((b) => !(b.id === entry.id && b.kind === entry.kind)));
    return false;
  }
  writeBookmarks([...list, { ...entry, addedAt: new Date().toISOString() }]);
  return true;
}

interface BookmarkButtonProps {
  id: string;
  kind: BookmarkKind;
  title: string;
  href?: string;
  summary?: string;
  className?: string;
}

/**
 * BookmarkButton — heart-icon toggle that saves/removes an item in the
 * browser's localStorage under `lj-bookmarks`. Used for products, notes,
 * tips, and articles across the patient portal.
 */
export function BookmarkButton({
  id,
  kind,
  title,
  href,
  summary,
  className,
}: BookmarkButtonProps) {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const list = readBookmarks();
    setActive(list.some((b) => b.id === id && b.kind === kind));
    function onChange() {
      const fresh = readBookmarks();
      setActive(fresh.some((b) => b.id === id && b.kind === kind));
    }
    window.addEventListener("lj-bookmarks-changed", onChange);
    return () => window.removeEventListener("lj-bookmarks-changed", onChange);
  }, [id, kind]);

  function onClick() {
    const nowActive = toggleBookmark({ id, kind, title, href, summary });
    setActive(nowActive);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? `Remove ${title} from bookmarks` : `Bookmark ${title}`}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center h-10 w-10 rounded-full",
        "transition-all duration-200 ease-smooth",
        "hover:bg-surface-muted active:scale-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={mounted && active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "transition-colors",
          mounted && active ? "text-rose-500" : "text-text-subtle hover:text-rose-500"
        )}
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
