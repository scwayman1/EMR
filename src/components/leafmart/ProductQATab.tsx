"use client";

// EMR-305 — Expandable Q&A tab on the PDP.
//
// Lives below the buy box, opens lazily so the initial PDP paint isn't
// dragged down by the Q&A list when most visitors never expand it. The
// "Ask a question" form posts through the same moderation gate as the
// server (preModerateQuestion) and then surfaces an optimistic pending
// thread until the real id is returned.

import { useMemo, useState } from "react";
import type { ProductQuestion, QAResponderRole } from "@/lib/marketplace/qa";

interface Props {
  productSlug: string;
  initialQuestions: ProductQuestion[];
}

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

export function ProductQATab({ productSlug, initialQuestions }: Props) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAnswered = useMemo(
    () => questions.filter((q) => q.answers.length > 0).length,
    [questions],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (draft.trim().length < 10) {
      setError("Question must be at least 10 characters.");
      return;
    }
    if (!name.trim()) {
      setError("Add your first name so the vendor can reply.");
      return;
    }
    setSubmitting(true);
    try {
      // Optimistic insert; the API will replace with the persisted row.
      const optimistic: ProductQuestion = {
        id: `pending-${Date.now()}`,
        productSlug,
        authorName: name.trim(),
        body: draft.trim(),
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
        answers: [],
      };
      setQuestions((q) => [optimistic, ...q]);
      setDraft("");

      const res = await fetch(`/api/leafmart/products/${productSlug}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorName: name.trim(), body: optimistic.body }),
      });
      if (!res.ok) {
        // Roll back the optimistic row.
        setQuestions((q) => q.filter((x) => x.id !== optimistic.id));
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Could not submit question.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="px-4 sm:px-6 lg:px-14 max-w-[1440px] mx-auto border-t border-[var(--border)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-6 sm:py-7 text-left"
      >
        <div>
          <p className="eyebrow text-[var(--leaf)] mb-1">Customer questions</p>
          <h2 className="font-display text-[22px] sm:text-[26px] font-normal tracking-tight text-[var(--ink)]">
            Q&amp;A
            <span className="text-[var(--muted)] font-normal text-[15px] ml-2">
              ({questions.length} asked · {totalAnswered} answered)
            </span>
          </h2>
        </div>
        <span
          aria-hidden="true"
          className={`text-[var(--muted)] text-2xl transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="pb-10 sm:pb-12">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6 mb-6"
          >
            <p className="eyebrow text-[var(--leaf)] mb-3">Ask a question</p>
            <input
              type="text"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px]"
            />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What do you want to know about this product?"
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] resize-y"
            />
            {error && (
              <p className="text-[12px] text-rose-700 mt-2">{error}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-[11.5px] text-[var(--muted)]">
                Submissions are screened before they appear publicly.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-5 py-2 text-[13px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit question"}
              </button>
            </div>
          </form>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">
              No questions yet. Be the first to ask.
            </div>
          ) : (
            <ul className="space-y-5">
              {questions.map((q) => (
                <QAItem key={q.id} question={q} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function QAItem({ question }: { question: ProductQuestion }) {
  return (
    <li className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <p className="font-medium text-[var(--ink)] text-[14.5px]">
          Q. {question.body}
        </p>
        <span className="text-[11.5px] text-[var(--muted)] whitespace-nowrap">
          asked by {question.authorName}
        </span>
      </div>
      {question.answers.length === 0 ? (
        <p className="text-[12.5px] text-[var(--muted)] italic">Awaiting answer</p>
      ) : (
        <ul className="space-y-3 mt-3">
          {question.answers.map((a) => (
            <li
              key={a.id}
              className="border-l-2 border-[var(--leaf)] pl-4 text-[13.5px] text-[var(--text-soft)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[var(--text)] text-[13px]">
                  {a.authorName}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ${ROLE_TONE[a.authorRole]}`}
                >
                  {ROLE_LABEL[a.authorRole]}
                </span>
              </div>
              <p className="leading-relaxed">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
