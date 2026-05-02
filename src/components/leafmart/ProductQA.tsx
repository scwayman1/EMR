"use client";

// EMR-305 — Expandable Q&A tab on the PDP.
//
// Self-contained client component. Renders a collapsed summary header
// ("12 questions · last answered 2 days ago"); when expanded it shows
// the threaded Q&A list and a compose form. Submitting a new question
// runs it through a minimal client-side moderation gate (length,
// blocked phrases) and then optimistically appends a "pending" thread.
//
// The parent owns persistence — pass `onAsk` to wire it up to your
// API. When `onAsk` is omitted the form still works, but the new
// question stays local to the session.

import { useMemo, useState } from "react";

export type QAResponderRole = "clinician" | "vendor" | "customer" | "moderator";

export interface QAAnswer {
  id: string;
  body: string;
  authorName: string;
  authorRole: QAResponderRole;
  createdAt: string;
  helpfulCount?: number;
}

export interface QAThread {
  id: string;
  question: string;
  askerName: string;
  createdAt: string;
  answers: QAAnswer[];
  /** True for an optimistic thread that hasn't been persisted yet. */
  pending?: boolean;
}

interface Props {
  productSlug: string;
  productName: string;
  initialThreads?: QAThread[];
  onAsk?: (question: string, askerName: string) => Promise<QAThread>;
}

const MIN_LEN = 8;
const MAX_LEN = 280;
// Patterns that get bounced before submission. Catches the most common
// off-topic / unsafe asks — server-side guardrails (see
// agent-guardrails.ts) still run as the source of truth.
const BLOCKED_PHRASES = [
  /\b(my (kid|child)|under\s*21)\b/i,
  /\b(prescribe|exact dose for me)\b/i,
];

const ROLE_LABEL: Record<QAResponderRole, string> = {
  clinician: "Clinician",
  vendor: "Vendor",
  customer: "Customer",
  moderator: "Moderator",
};

const ROLE_TONE: Record<QAResponderRole, string> = {
  clinician: "bg-[var(--leaf)] text-[var(--bg)]",
  vendor: "bg-[var(--ink)] text-[var(--bg)]",
  customer: "bg-[var(--surface-muted)] text-[var(--text)]",
  moderator: "bg-[var(--peach)] text-[var(--ink)]",
};

export function ProductQA({
  productSlug,
  productName,
  initialThreads = [],
  onAsk,
}: Props) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<QAThread[]>(initialThreads);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = threads.length;
    const lastAnswered = threads
      .flatMap((t) => t.answers)
      .map((a) => +new Date(a.createdAt))
      .filter((n) => !isNaN(n))
      .sort((a, b) => b - a)[0];
    return {
      total,
      lastAnswered: lastAnswered ? relativeTime(lastAnswered) : null,
    };
  }, [threads]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const question = draft.trim();
    const asker = name.trim() || "Anonymous";
    if (question.length < MIN_LEN) {
      setError(`Questions need at least ${MIN_LEN} characters.`);
      return;
    }
    if (question.length > MAX_LEN) {
      setError(`Keep questions under ${MAX_LEN} characters.`);
      return;
    }
    for (const re of BLOCKED_PHRASES) {
      if (re.test(question)) {
        setError(
          "Our moderators can't accept that wording — try rephrasing without specifics about minors or personal dosing."
        );
        return;
      }
    }

    const optimistic: QAThread = {
      id: `pending-${Date.now()}`,
      question,
      askerName: asker,
      createdAt: new Date().toISOString(),
      answers: [],
      pending: true,
    };
    setThreads((prev) => [optimistic, ...prev]);
    setDraft("");
    setSubmitting(true);

    try {
      if (onAsk) {
        const persisted = await onAsk(question, asker);
        setThreads((prev) =>
          prev.map((t) => (t.id === optimistic.id ? persisted : t))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that question.");
      setThreads((prev) => prev.filter((t) => t.id !== optimistic.id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      data-product-slug={productSlug}
      className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto border-t border-[var(--border)]"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left group"
      >
        <div>
          <p className="eyebrow text-[var(--leaf)] mb-2">Ask the shelf</p>
          <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">
            Questions &amp; answers
          </h2>
          <p className="text-[13px] text-[var(--muted)] mt-2">
            {summary.total === 0
              ? "Be the first to ask about this product."
              : `${summary.total} ${summary.total === 1 ? "thread" : "threads"}${
                  summary.lastAnswered ? ` · last answered ${summary.lastAnswered}` : ""
                }`}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`text-2xl text-[var(--muted)] group-hover:text-[var(--ink)] transition-transform ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      {open && (
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 sm:gap-12">
          <ul className="space-y-4">
            {threads.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-[13px] text-[var(--muted)]">
                No questions yet. Yours will land at the top.
              </li>
            ) : (
              threads.map((t) => <ThreadCard key={t.id} thread={t} />)
            )}
          </ul>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6 self-start"
          >
            <p className="eyebrow text-[var(--leaf)] mb-2">Ask about {productName}</p>
            <label className="block mb-3">
              <span className="text-[12px] text-[var(--muted)] mb-1 block">Your name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13.5px] focus:outline-none focus:border-[var(--leaf)]"
              />
            </label>
            <label className="block mb-3">
              <span className="text-[12px] text-[var(--muted)] mb-1 block">Question</span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={MAX_LEN}
                placeholder="What would you like to know?"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13.5px] resize-none focus:outline-none focus:border-[var(--leaf)]"
              />
              <span className="text-[11px] text-[var(--muted)] block text-right mt-1 tabular-nums">
                {draft.length}/{MAX_LEN}
              </span>
            </label>
            {error && (
              <p className="text-[12.5px] text-amber-700 mb-3">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] py-2.5 text-[13.5px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-60"
            >
              {submitting ? "Posting…" : "Post question"}
            </button>
            <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">
              Questions are reviewed before they go live. We pass clinical questions to a Leafjourney clinician within one business day.
            </p>
          </form>
        </div>
      )}
    </section>
  );
}

function ThreadCard({ thread }: { thread: QAThread }) {
  return (
    <li className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <h4 className="font-display text-[16px] font-medium text-[var(--ink)] leading-snug">
          Q. {thread.question}
        </h4>
        <time className="text-[11.5px] text-[var(--muted)] whitespace-nowrap">
          {relativeTime(+new Date(thread.createdAt))}
        </time>
      </div>
      <p className="text-[12px] text-[var(--muted)] mb-4">
        Asked by {thread.askerName}
        {thread.pending && (
          <span className="ml-2 inline-flex items-center gap-1 text-[var(--leaf)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)] animate-pulse" />
            Awaiting moderation
          </span>
        )}
      </p>
      {thread.answers.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)] italic">
          No answers yet — a clinician or vendor usually replies within a day.
        </p>
      ) : (
        <ul className="space-y-3">
          {thread.answers.map((a) => (
            <li key={a.id} className="border-l-2 border-[var(--border)] pl-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide ${ROLE_TONE[a.authorRole]}`}
                >
                  {ROLE_LABEL[a.authorRole]}
                </span>
                <span className="text-[12px] font-medium text-[var(--text)]">
                  {a.authorName}
                </span>
                <span className="text-[11.5px] text-[var(--muted)]">
                  {relativeTime(+new Date(a.createdAt))}
                </span>
              </div>
              <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function relativeTime(ts: number): string {
  if (!ts || isNaN(ts)) return "recently";
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}
