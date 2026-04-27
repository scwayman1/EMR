"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Music, X, Settings2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "leafjourney:music-widget:url";

/** Convert a Spotify or Apple Music share/page URL into a playable embed URL.
 * Returns the original input when it already looks like an embed, or null
 * when nothing recognisable is found. */
function toEmbedUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return null;

  // Already an embed URL — pass through.
  if (
    url.includes("open.spotify.com/embed/") ||
    url.includes("embed.music.apple.com/") ||
    url.includes("/embed?") ||
    url.includes("&embed")
  ) {
    return url;
  }

  // Spotify share: https://open.spotify.com/{track|playlist|album|episode|show}/{id}
  const spotify = url.match(
    /open\.spotify\.com\/(track|playlist|album|episode|show)\/([A-Za-z0-9]+)/,
  );
  if (spotify) {
    return `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}`;
  }

  // Apple Music share: https://music.apple.com/...
  if (/^https:\/\/music\.apple\.com\//.test(url)) {
    return url.replace("https://music.apple.com/", "https://embed.music.apple.com/");
  }

  return null;
}

function isAppleMusic(embedUrl: string): boolean {
  return embedUrl.includes("embed.music.apple.com/");
}

export function MusicWidget() {
  const [url, setUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const draftRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUrl(stored);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => draftRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const apply = (raw: string) => {
    const next = toEmbedUrl(raw);
    if (!next) {
      setError("Paste a Spotify or Apple Music link.");
      return;
    }
    setUrl(next);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage quota / disabled — silently degrade
    }
  };

  const clear = () => {
    setUrl(null);
    setDraft("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const iframeHeight = useMemo(() => {
    if (!url) return 80;
    return isAppleMusic(url) ? 175 : 152;
  }, [url]);

  if (!hydrated) return null;

  return (
    <div className="fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6 print:hidden">
      {!open && !url && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open calming-music player"
          className={cn(
            "group inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5",
            "bg-surface-raised/95 backdrop-blur-md border border-border shadow-xl",
            "text-sm font-semibold text-text",
            "transition-all hover:shadow-2xl hover:-translate-y-0.5",
          )}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Music className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span>Calming music</span>
        </button>
      )}

      {(open || url) && (
        <div
          role="region"
          aria-label="Music player"
          className={cn(
            "w-[min(360px,calc(100vw-2rem))] rounded-2xl overflow-hidden",
            "bg-surface-raised/95 backdrop-blur-md border border-border shadow-2xl",
          )}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
                <Music className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted truncate">
                {url ? (isAppleMusic(url) ? "Apple Music" : "Spotify") : "Add a station"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {url && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-label={open ? "Hide settings" : "Show settings"}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                >
                  <Settings2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              )}
              {(open || url) && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  aria-label="Close"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {url && (
            <div className="bg-bg">
              <iframe
                key={url}
                src={url}
                title="Embedded music player"
                width="100%"
                height={iframeHeight}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block w-full"
                style={{ border: 0 }}
              />
            </div>
          )}

          {open && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                apply(draft);
                if (toEmbedUrl(draft)) setOpen(false);
              }}
              className="px-4 py-3 space-y-2 bg-surface-muted/40"
            >
              <label
                htmlFor="music-widget-url"
                className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted"
              >
                Spotify or Apple Music link
              </label>
              <input
                ref={draftRef}
                id="music-widget-url"
                type="url"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://open.spotify.com/playlist/..."
                className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              />
              {error && (
                <p className="text-[11px] text-[color:var(--danger)]">{error}</p>
              )}
              <div className="flex items-center justify-between gap-2 pt-1">
                {url ? (
                  <button
                    type="button"
                    onClick={clear}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted hover:text-text"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                    Clear
                  </button>
                ) : <span />}
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-md hover:shadow-lg transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
