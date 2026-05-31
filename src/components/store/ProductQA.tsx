"use client";

// EMR-305 — Expandable "Questions and Answers" tab.
//
// Bottom-of-PDP collapsible section with: an AI summary of the most common
// questions, the customer Q&A threads inline (ranked by helpfulness), and a
// form for shoppers to ask a new question. Submissions run through the same
// pre-moderation gate as the server before they'd be persisted.

import * as React from "react";
import { ChevronDown, Sparkles, MessageCircleQuestion, BadgeCheck } from "lucide-react";
import type { ProductQuestion, QAResponderRole } from "@/lib/marketplace/qa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const ROLE_LABEL: Record<QAResponderRole, string> = {
  vendor: "Vendor",
  clinician: "Clinician",
  customer: "Customer",
  moderator: "Leafmart",
};

const MIN_QUESTION_LEN = 10;
const MAX_QUESTION_LEN = 600;

// Client-side mirror of the server pre-moderation gate (lib/marketplace/
// qa.ts is server-only). The authoritative check still runs on submit; this
// just gives the asker instant feedback.
function validateQuestion(authorName: string, body: string): string[] {
  const reasons: string[] = [];
  const trimmed = body.trim();
  if (trimmed.length < MIN_QUESTION_LEN) reasons.push(`question must be at least ${MIN_QUESTION_LEN} characters`);
  if (trimmed.length > MAX_QUESTION_LEN) reasons.push(`question must be ${MAX_QUESTION_LEN} characters or fewer`);
  if (!authorName.trim()) reasons.push("your name is required");
  return reasons;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ProductQA({
  productSlug,
  questions: initialQuestions,
  aiSummary,
  defaultOpen = false,
}: {
  productSlug: string;
  questions: ProductQuestion[];
  aiSummary: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [questions, setQuestions] = React.useState(initialQuestions);
  const [name, setName] = React.useState("");
  const [body, setBody] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [submitted, setSubmitted] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reasons = validateQuestion(name, body);
    if (reasons.length > 0) {
      setErrors(reasons);
      return;
    }
    // Optimistic insert; in production this round-trips to the AI moderator
    // and is persisted server-side. Here we surface it immediately as pending.
    setQuestions((prev) => [
      {
        id: `q-${productSlug}-${Date.now()}`,
        productSlug,
        authorName: name.trim(),
        body: body.trim(),
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
        answers: [],
      },
      ...prev,
    ]);
    setName("");
    setBody("");
    setErrors([]);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface-raised" id="questions">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-6"
        aria-expanded={open}
        aria-controls="qa-panel"
      >
        <span className="flex items-center gap-2.5">
          <MessageCircleQuestion width={18} height={18} className="text-accent" />
          <span className="font-display text-lg tracking-tight text-text">Questions and Answers</span>
          <span className="text-[12px] text-text-subtle">({questions.length})</span>
        </span>
        <ChevronDown
          width={18}
          height={18}
          className={cn("text-text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div id="qa-panel" className="border-t border-border/70 px-5 pb-6 pt-4 sm:px-6">
          {/* AI summary */}
          <div className="rounded-xl border border-accent/25 bg-accent-soft/40 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              <Sparkles width={12} height={12} /> AI summary
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-text">{aiSummary}</p>
          </div>

          {/* Threads */}
          <ul className="mt-5 space-y-4">
            {questions.map((q) => (
              <li key={q.id} className="border-b border-border/60 pb-4 last:border-0">
                <p className="text-[14px] font-medium text-text">Q: {q.body}</p>
                <p className="mt-0.5 text-[11.5px] text-text-subtle">
                  {q.authorName} · {relativeDate(q.createdAt)}
                  {q.answers.length === 0 && (
                    <span className="ml-2 italic text-text-subtle">Pending an answer</span>
                  )}
                </p>
                {q.answers.map((a) => (
                  <div key={a.id} className="mt-2.5 rounded-xl bg-surface px-3.5 py-2.5">
                    <p className="text-[13.5px] leading-relaxed text-text">A: {a.body}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-text-subtle">
                      <Badge tone={a.authorRole === "clinician" || a.authorRole === "vendor" ? "accent" : "neutral"}>
                        {(a.authorRole === "clinician" || a.authorRole === "vendor") && (
                          <BadgeCheck width={11} height={11} />
                        )}
                        {ROLE_LABEL[a.authorRole]}
                      </Badge>
                      {a.authorName} · {relativeDate(a.createdAt)}
                    </p>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {/* Ask form */}
          <form onSubmit={onSubmit} className="mt-5 rounded-xl border border-border bg-surface p-4">
            <p className="text-[13px] font-medium text-text">Have a question about this product?</p>
            <div className="mt-3 space-y-2.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-[13px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ask the vendor, our clinical team, or other shoppers…"
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-[13px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            {errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-[12px] text-danger">
                {errors.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {submitted && (
              <p className="mt-2 text-[12px] text-accent">
                Thanks! Your question is in moderation and will appear once approved.
              </p>
            )}
            <div className="mt-3">
              <Button type="submit" size="sm">
                Post your question
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
