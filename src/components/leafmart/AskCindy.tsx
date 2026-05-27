"use client";

// EMR-309 — Ask Cindy chatbot.
//
// Floating button in the bottom-right corner that opens a chat panel.
// Cindy is the consumer-facing concierge: cannabis education, product
// suggestions, order help. She speaks within the consumer guardrails
// (see src/lib/leafmart/agent-guardrails.ts) — she will refuse dose
// prescriptions and route clinical questions to Leafjourney.
//
// The component is transport-agnostic. By default it sends turns to
// `/api/leafmart/ask-cindy` with `{ messages }`; pass `onSend` to wire
// it into any other backend.

import { useEffect, useRef, useState } from "react";
import {
  buildSystemPrompt,
  buildRefusal,
  screenInput,
  type GuardrailContext,
} from "@/lib/leafmart/agent-guardrails";

export interface CindyMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  blocked?: boolean;
  createdAt: number;
}

interface Props {
  /** Optional override for the chat backend. Resolves to the assistant text. */
  onSend?: (turns: CindyMessage[]) => Promise<string>;
  /** Greeting Cindy opens with — kept short so the panel doesn't feel chatty. */
  greeting?: string;
  /** Defaults to /api/leafmart/ask-cindy. */
  endpoint?: string;
  /** Wire age verification into the guardrails. */
  ageVerified?: boolean;
}

const DEFAULT_GREETING =
  "Hi — I'm Cindy. I can help you find a product, explain a format, or hand you off to a clinician. What's on your mind?";

const PROMPTS = [
  "What's the difference between an indica and sativa edible?",
  "Find me something for sleep without melatonin.",
  "How do I read a COA?",
];

const GUARDRAIL_CTX: Omit<GuardrailContext, "ageVerified"> = {
  mode: "consumer",
  surface: "ask-cindy",
};

export function AskCindy({
  onSend,
  greeting = DEFAULT_GREETING,
  endpoint = "/api/leafmart/ask-cindy",
  ageVerified = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<CindyMessage[]>(() => [
    {
      id: "greeting",
      role: "assistant",
      content: greeting,
      createdAt: Date.now(),
    },
  ]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [open, messages]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;

    const ctx: GuardrailContext = { ...GUARDRAIL_CTX, ageVerified };
    const screened = screenInput(text, ctx);

    const userMsg: CindyMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    if (!screened.allowed) {
      const refusal = buildRefusal(screened);
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: refusal.message,
          blocked: true,
          createdAt: Date.now(),
        },
      ]);
      setDraft("");
      return;
    }

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setPending(true);

    try {
      const turnHistory: CindyMessage[] = [
        {
          id: "system",
          role: "system",
          content: buildSystemPrompt(ctx),
          createdAt: Date.now(),
        },
        ...messages.filter((m) => m.role !== "system"),
        { ...userMsg, content: screened.redacted },
      ];

      let reply: string;
      if (onSend) {
        reply = await onSend(turnHistory);
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: turnHistory }),
        });
        if (!res.ok) throw new Error(`Cindy is taking a quick break (${res.status}).`);
        const json = (await res.json()) as { reply?: string };
        reply =
          json.reply ??
          "I lost my train of thought there — could you ask that again?";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong — please try again.",
          blocked: true,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open Ask Cindy"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--ink)] text-[var(--bg)] px-5 py-3 shadow-xl hover:bg-[var(--leaf)] transition-colors"
      >
        <CindyMark />
        <span className="text-[13.5px] font-medium">Ask Cindy</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ask Cindy"
          className="fixed bottom-20 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[80vh] rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)]">
            <div className="flex items-center gap-2">
              <CindyMark />
              <div>
                <p className="text-[13.5px] font-semibold text-[var(--ink)]">Cindy</p>
                <p className="text-[11px] text-[var(--muted)]">Leafmart concierge · not a doctor</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Cindy"
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-[var(--ink)] text-lg"
            >
              ×
            </button>
          </header>

          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.filter((m) => m.role !== "system").map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {pending && <Bubble message={{
              id: "typing",
              role: "assistant",
              content: "…",
              createdAt: Date.now(),
            }} typing />}
            {messages.length <= 1 && !pending && (
              <ul className="pt-2 space-y-2">
                {PROMPTS.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => send(p)}
                      className="w-full text-left rounded-2xl border border-dashed border-[var(--border)] px-3 py-2 text-[12.5px] text-[var(--text-soft)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="border-t border-[var(--border)] p-3 flex items-end gap-2 bg-[var(--surface)]"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              placeholder="Ask about a product, format, or your order…"
              className="flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--leaf)] max-h-[120px]"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="rounded-full bg-[var(--ink)] text-[var(--bg)] w-10 h-10 flex items-center justify-center hover:bg-[var(--leaf)] transition-colors disabled:opacity-50"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 8L14 2L8 14L7 9L2 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({
  message,
  typing,
}: {
  message: CindyMessage;
  typing?: boolean;
}) {
  const mine = message.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
          mine
            ? "bg-[var(--ink)] text-[var(--bg)]"
            : message.blocked
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : "bg-[var(--surface-muted)] text-[var(--text)]"
        }`}
      >
        {typing ? (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-pulse [animation-delay:120ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-pulse [animation-delay:240ms]" />
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

function CindyMark() {
  return (
    <span
      aria-hidden="true"
      className="w-7 h-7 rounded-full bg-[var(--leaf)] text-[var(--bg)] inline-flex items-center justify-center font-display text-[13px]"
    >
      C
    </span>
  );
}
