"use client";

/**
 * ChatCB v0 — single-column chat UI.
 *
 * Public-facing conversational search for medical cannabis. Intentionally
 * minimal: message history, text input, send button. iOS-aesthetic per
 * CLAUDE.md — rounded corners, large touch targets, restrained palette.
 *
 * The server action it talks to is `askChatCB` in
 * `src/app/education/chatcb/actions.ts`. Citations and classification are
 * rendered when present but empty in v0 — populated by a later ticket.
 */

import { useRef, useState, useEffect } from "react";
import { askChatCB, type ChatCBCitation, type EvidenceClassification } from "@/app/education/chatcb/actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCBCitation[];
  classification?: EvidenceClassification | null;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me anything about medical cannabis. I cite research and flag evidence strength.",
};

/** Color chip for the MCL positive/negative/neutral classification. */
const CLASSIFICATION_STYLES: Record<EvidenceClassification, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  negative: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
  mixed: "bg-amber-100 text-amber-800",
  insufficient: "bg-sky-100 text-sky-800",
};

export default function ChatCBUI() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest turn when the transcript changes.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || pending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: q,
    };
    // Snapshot before adding the new user message so we don't send the
    // unanswered question as prior history to the model.
    const priorHistory = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);

    try {
      const result = await askChatCB(q, priorHistory);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.content,
        citations: result.citations,
        classification: result.classification,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Something went wrong (${msg}). Please try again.`,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full px-4 sm:px-6">
      {/* ── Transcript ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending && <TypingIndicator />}
        <div ref={scrollRef} />
      </div>

      {/* ── Input bar ────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="sticky bottom-0 bg-white/80 backdrop-blur border-t border-slate-200 py-4"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chatcb-input" className="sr-only">
            Ask ChatCB
          </label>
          <textarea
            id="chatcb-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask about a cannabinoid, a condition, a drug interaction..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[48px] max-h-40"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            className="h-12 px-5 rounded-2xl bg-emerald-600 text-white font-medium shadow-sm transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 text-center">
          ChatCB cites research when it can. Not medical advice — talk to your clinician.
        </p>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl bg-emerald-600 text-white px-4 py-3 shadow-sm"
            : "max-w-[85%] rounded-2xl bg-slate-100 text-slate-900 px-4 py-3 shadow-sm"
        }
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {message.content}
        </p>

        {message.classification && (
          <div className="mt-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CLASSIFICATION_STYLES[message.classification]}`}
            >
              Evidence: {message.classification}
            </span>
          </div>
        )}

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 border-t border-slate-200/50 pt-2 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
              Sources
            </p>
            {message.citations.map((c) => (
              <div key={c.id} className="text-[13px] leading-snug">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    {c.title}
                  </a>
                ) : (
                  <span className="text-slate-700">{c.title}</span>
                )}
                <span className="text-slate-500">
                  {" "}
                  — {c.source}
                  {c.year ? `, ${c.year}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-slate-100 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
