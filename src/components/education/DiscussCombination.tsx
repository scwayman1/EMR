"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessagesSquare, X, Hash, Lock, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "@/components/ui/ornament";

// Lightweight display map for the 12 known compounds. Until the database
// migration (Linear: cannabinoid + terpene Supabase tables) lands, this is the
// minimal info DiscussCombination needs to render readable tags. When the page
// can pass richer metadata via the `compounds` prop, this fallback is bypassed.
type CompoundMeta = { name: string; symptoms?: string[] };
const FALLBACK_COMPOUNDS: Record<string, CompoundMeta> = {
  thc: { name: "THC", symptoms: ["Pain", "Insomnia", "Nausea"] },
  cbd: { name: "CBD", symptoms: ["Anxiety", "Inflammation", "Pain"] },
  cbn: { name: "CBN", symptoms: ["Insomnia", "Pain"] },
  cbg: { name: "CBG", symptoms: ["Anxiety", "Inflammation", "IBD"] },
  thca: { name: "THCA", symptoms: ["Nausea", "Inflammation"] },
  cbda: { name: "CBDA", symptoms: ["Nausea", "Anxiety", "Inflammation"] },
  myrcene: { name: "Myrcene", symptoms: ["Pain", "Insomnia"] },
  limonene: { name: "Limonene", symptoms: ["Depression", "Anxiety", "Stress"] },
  linalool: { name: "Linalool", symptoms: ["Anxiety", "Insomnia"] },
  pinene: { name: "Pinene", symptoms: ["Inflammation", "Asthma"] },
  caryophyllene: {
    name: "Caryophyllene",
    symptoms: ["Pain", "Inflammation", "Anxiety"],
  },
  humulene: { name: "Humulene", symptoms: ["Inflammation", "Pain"] },
};

const toTag = (label: string) =>
  "#" + label.replace(/[^a-zA-Z0-9]+/g, "");

export type DiscussCombinationProps = {
  selectedIds: string[];
  /** Optional: when the host page has richer compound data, pass it here. */
  compounds?: Record<string, CompoundMeta>;
  /** Where to open the forum. When omitted, the modal stays in "coming soon" mode. */
  forumHref?: string;
  className?: string;
};

export function DiscussCombination({
  selectedIds,
  compounds,
  forumHref,
  className,
}: DiscussCombinationProps) {
  const [open, setOpen] = useState(false);

  const lookup = compounds ?? FALLBACK_COMPOUNDS;

  const compoundLabels = useMemo(
    () =>
      selectedIds
        .map((id) => lookup[id]?.name)
        .filter((n): n is string => Boolean(n)),
    [selectedIds, lookup],
  );

  // Top symptoms across the selection, ranked by overlap. Mirrors the wheel's
  // own aggregation logic so tags match the on-screen association panel.
  const symptomTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of selectedIds) {
      const symptoms = lookup[id]?.symptoms ?? [];
      for (const s of symptoms) counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b))
      .slice(0, 4)
      .map(([s]) => s);
  }, [selectedIds, lookup]);

  const compoundTags = compoundLabels.map(toTag);
  const allTags = [...compoundTags, ...symptomTags.map(toTag)];

  if (selectedIds.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-8 sm:mt-10 animate-in fade-in slide-in-from-bottom-3 duration-500",
        className,
      )}
    >
      <CtaCard
        compoundCount={selectedIds.length}
        compoundLabels={compoundLabels}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <DraftModal
          compoundLabels={compoundLabels}
          tags={allTags}
          forumHref={forumHref}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function CtaCard({
  compoundCount,
  compoundLabels,
  onOpen,
}: {
  compoundCount: number;
  compoundLabels: string[];
  onOpen: () => void;
}) {
  const summary =
    compoundLabels.length === 0
      ? `${compoundCount} compounds`
      : compoundLabels.length <= 3
        ? compoundLabels.join(" + ")
        : `${compoundLabels.slice(0, 2).join(" + ")} + ${compoundLabels.length - 2} more`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-muted px-5 py-5 sm:px-7 sm:py-6 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-leaf/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-leaf-soft text-leaf">
            <MessagesSquare className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <Eyebrow className="mb-1.5 text-leaf">Patient community</Eyebrow>
            <p className="font-display text-lg sm:text-xl text-text tracking-tight leading-snug">
              Discuss this combination
            </p>
            <p className="mt-1 text-sm text-text-muted leading-relaxed">
              Compare notes on{" "}
              <span className="font-semibold text-text">{summary}</span> with
              other patients exploring the same regimen.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "inline-flex items-center justify-center gap-2 self-start sm:self-auto",
            "h-11 rounded-full px-5 text-sm font-semibold text-white",
            "bg-leaf shadow-md transition-all",
            "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          )}
        >
          <MessagesSquare className="h-4 w-4" strokeWidth={2.5} />
          Start a thread
        </button>
      </div>
    </div>
  );
}

function DraftModal({
  compoundLabels,
  tags,
  forumHref,
  onClose,
}: {
  compoundLabels: string[];
  tags: string[];
  forumHref?: string;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const initialTitle =
    compoundLabels.length > 0
      ? `My experience combining ${compoundLabels.slice(0, 3).join(" + ")}${compoundLabels.length > 3 ? ` + ${compoundLabels.length - 3} more` : ""}`
      : "My combination experience";
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState("");
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forumHref) {
      const url = new URL(forumHref, window.location.origin);
      url.searchParams.set("title", title);
      url.searchParams.set("body", body);
      url.searchParams.set("tags", tags.join(","));
      window.location.assign(url.toString());
      return;
    }
    setPosted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discuss-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-text/40 backdrop-blur-sm cursor-default"
      />

      <div
        className={cn(
          "relative w-full sm:max-w-2xl bg-bg shadow-2xl",
          "rounded-t-3xl sm:rounded-3xl border border-border",
          "max-h-[92vh] overflow-y-auto",
          "animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300",
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-bg/95 backdrop-blur px-6 py-4">
          <div>
            <Eyebrow className="mb-1 text-leaf">New community draft</Eyebrow>
            <h3
              id="discuss-modal-title"
              className="font-display text-xl text-text tracking-tight"
            >
              Discuss this combination
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {posted ? <ComingSoonState onClose={onClose} /> : (
          <form onSubmit={onSubmit} className="px-6 py-6 space-y-5">
            <div>
              <label
                htmlFor="discuss-title"
                className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2"
              >
                Title
              </label>
              <input
                ref={titleRef}
                id="discuss-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 rounded-2xl border border-border bg-surface px-4 text-base text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-leaf/40 focus:border-leaf/40"
              />
            </div>

            <div>
              <label
                htmlFor="discuss-body"
                className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2"
              >
                What worked, what didn&apos;t?
              </label>
              <textarea
                id="discuss-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Share your timing, dosage, what symptoms it touched, and any side effects. Anonymous by default."
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-muted/60 leading-relaxed focus:outline-none focus:ring-2 focus:ring-leaf/40 focus:border-leaf/40 resize-y"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                Tags{" "}
                <span className="text-text-muted/60 font-normal normal-case tracking-normal">
                  (auto-derived from your wheel selection)
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-3 py-1 text-xs font-medium text-leaf"
                  >
                    <Hash className="h-3 w-3" strokeWidth={2.5} />
                    {tag.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-2 border-t border-border">
              <p className="text-[11px] text-text-muted/80 leading-relaxed inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3" strokeWidth={2.5} />
                Anonymous by default. No identifiers attached.
              </p>
              <div className="flex gap-2 sm:gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-text hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cn(
                    "inline-flex items-center gap-2",
                    "h-10 rounded-full px-5 text-sm font-semibold text-white",
                    "bg-leaf shadow-md transition-all",
                    "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
                  )}
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {forumHref ? "Open in forum" : "Save draft"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ComingSoonState({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 py-12 text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-leaf-soft text-leaf">
        <MessagesSquare className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h4 className="font-display text-2xl text-text tracking-tight">
        Draft saved.
      </h4>
      <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
        Patient Forums launch soon. We&apos;ll publish your draft to the right
        cohort thread the moment they go live.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center justify-center h-11 rounded-full bg-leaf px-6 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
      >
        Got it
      </button>
    </div>
  );
}
