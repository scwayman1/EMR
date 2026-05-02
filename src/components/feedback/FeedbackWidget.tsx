"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Universal feedback widget — EMR-128
 *
 * Successor to <UniversalFeedbackFab/> with three improvements:
 *
 *  1. **Pluggable mount.** The widget can render as a floating
 *     bottom-right FAB (`mode="fab"`, the default), or inline inside
 *     any header / footer (`mode="inline"`) so dense surfaces aren't
 *     forced to give up the corner.
 *  2. **Page-snapshot annotation.** When `html2canvas` (or any other
 *     DOM-rasterizer adapter) is configured via `setSnapshotter`, the
 *     widget rasterizes the visible viewport into the annotation canvas
 *     before the user draws on it — pen, circle, arrow, and box marks
 *     land on the actual page screenshot. Without an adapter, the
 *     widget falls back to a faint viewport outline (matching the
 *     legacy FAB behavior) so it always works.
 *  3. **Programmatic open API.** Exports `useFeedbackWidget()` so any
 *     surface can open the widget pre-populated ("Tell us what's
 *     missing in this report"), seed it with a tag, or attach extra
 *     metadata to the submission payload.
 */

type Tool = "pen" | "circle" | "arrow" | "box";
type State = "closed" | "form" | "annotating" | "submitting" | "thanks" | "error";

const TOOLS: Array<{ key: Tool; label: string }> = [
  { key: "pen", label: "Pen" },
  { key: "circle", label: "Circle" },
  { key: "arrow", label: "Arrow" },
  { key: "box", label: "Box" },
];

interface DrawnShape {
  tool: Tool;
  points: Array<{ x: number; y: number }>;
}

export type FeedbackTag = "bug" | "idea" | "praise" | "confused";

const TAGS: Array<{ key: FeedbackTag; label: string; emoji: string }> = [
  { key: "bug", label: "Something broke", emoji: "🐞" },
  { key: "idea", label: "I have an idea", emoji: "💡" },
  { key: "confused", label: "I'm confused", emoji: "🤔" },
  { key: "praise", label: "I love this", emoji: "🌱" },
];

export interface FeedbackPayload {
  clientId: string;
  pageUrl: string;
  comment: string;
  tag: FeedbackTag | null;
  annotationDataUrl?: string;
  userAgent: string;
  viewport: { width: number; height: number };
  occurredAt: string;
  /** Caller-supplied metadata (route, patientId, encounterId, etc.). */
  extra?: Record<string, unknown>;
}

export type Snapshotter = (target: HTMLElement) => Promise<string>;

let configuredSnapshotter: Snapshotter | null = null;

/**
 * Wire up an html2canvas-style page rasterizer. The adapter receives
 * the documentElement and returns a PNG data URL the canvas paints
 * before the user starts marking.
 */
export function setSnapshotter(snap: Snapshotter | null) {
  configuredSnapshotter = snap;
}

interface WidgetController {
  open: (seed?: { comment?: string; tag?: FeedbackTag; extra?: Record<string, unknown> }) => void;
}

const widgetRef: { current: WidgetController | null } = { current: null };

/**
 * Imperative handle for opening the widget from anywhere in the app.
 * Components subscribe inside an effect; the actual open() call is fire-
 * and-forget so it can be triggered from event handlers or notifications.
 */
export function useFeedbackWidget() {
  return React.useMemo<WidgetController>(
    () => ({
      open(seed) {
        widgetRef.current?.open(seed);
      },
    }),
    [],
  );
}

export interface FeedbackWidgetProps {
  /**
   * Where the launcher renders. `fab` = fixed bottom-right.
   * `inline` = caller controls placement (returns just the trigger
   * button; the dialog still portals to the document body).
   */
  mode?: "fab" | "inline";
  /** Endpoint the payload is POSTed to. */
  endpoint?: string;
  /** Optional className applied to the launcher button. */
  className?: string;
  /** Caller-attached metadata included in the submitted payload. */
  defaultExtra?: Record<string, unknown>;
}

export function FeedbackWidget({
  mode = "fab",
  endpoint = "/api/feedback/whisper",
  className,
  defaultExtra,
}: FeedbackWidgetProps) {
  const [state, setState] = React.useState<State>("closed");
  const [comment, setComment] = React.useState("");
  const [tag, setTag] = React.useState<FeedbackTag | null>(null);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [shapes, setShapes] = React.useState<DrawnShape[]>([]);
  const [drawing, setDrawing] = React.useState<DrawnShape | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);
  const [extra, setExtra] = React.useState<Record<string, unknown> | undefined>(
    defaultExtra,
  );
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Stable per-browser id used for de-dupe across reloads / retries.
  const clientIdRef = React.useRef<string>("");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let id = window.localStorage.getItem("lj-feedback-client-id");
    if (!id) {
      id = `fcid-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      window.localStorage.setItem("lj-feedback-client-id", id);
    }
    clientIdRef.current = id;
  }, []);

  const open = React.useCallback(
    async (seed?: { comment?: string; tag?: FeedbackTag; extra?: Record<string, unknown> }) => {
      setState("form");
      setError(null);
      if (seed?.comment) setComment(seed.comment);
      if (seed?.tag) setTag(seed.tag);
      if (seed?.extra) setExtra({ ...(defaultExtra ?? {}), ...seed.extra });
      else setExtra(defaultExtra);

      if (configuredSnapshotter && typeof document !== "undefined") {
        try {
          const url = await configuredSnapshotter(document.documentElement);
          setSnapshotUrl(url);
        } catch {
          setSnapshotUrl(null);
        }
      }
    },
    [defaultExtra],
  );

  const close = React.useCallback(() => {
    setState("closed");
    setComment("");
    setTag(null);
    setShapes([]);
    setDrawing(null);
    setError(null);
    setSnapshotUrl(null);
  }, []);

  // Register the imperative handle so useFeedbackWidget() callers can
  // open the widget from anywhere in the tree. Last mount wins; in
  // practice we only ever expect one widget per page.
  React.useEffect(() => {
    const handler: WidgetController["open"] = (seed) => {
      void open(seed);
    };
    widgetRef.current = { open: handler };
    return () => {
      if (widgetRef.current?.open === handler) {
        widgetRef.current = null;
      }
    };
  }, [open]);

  // Repaint the canvas whenever the underlying data changes.
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    const finishPaint = () => {
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.fillStyle = "rgba(192, 57, 43, 0.15)";
      const all = drawing ? [...shapes, drawing] : shapes;
      for (const s of all) drawShape(ctx, s);
    };

    if (snapshotUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        finishPaint();
      };
      img.src = snapshotUrl;
      return;
    }

    // Fallback — faint backdrop with a dashed viewport outline.
    ctx.fillStyle = "rgba(63, 110, 79, 0.04)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(63, 110, 79, 0.2)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
    ctx.setLineDash([]);
    finishPaint();
  }, [shapes, drawing, snapshotUrl]);

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDrawing({ tool, points: [point] });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tool === "pen") setDrawing({ ...drawing, points: [...drawing.points, point] });
    else setDrawing({ ...drawing, points: [drawing.points[0]!, point] });
  }
  function endDraw() {
    if (!drawing) return;
    setShapes((prev) => [...prev, drawing]);
    setDrawing(null);
  }

  async function submit() {
    if (comment.trim().length < 5) {
      setError("Tell us a little more — at least 5 characters helps us route it.");
      return;
    }
    setState("submitting");
    setError(null);
    try {
      const annotationDataUrl =
        shapes.length > 0 ? canvasRef.current?.toDataURL("image/png") : undefined;
      const payload: FeedbackPayload = {
        clientId: clientIdRef.current,
        pageUrl: window.location.href,
        comment,
        tag,
        annotationDataUrl,
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        occurredAt: new Date().toISOString(),
        extra,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `HTTP ${res.status}`);
        setState("error");
        return;
      }
      setState("thanks");
      setTimeout(close, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setState("error");
    }
  }

  const launcher =
    state === "closed" ? (
      <button
        type="button"
        onClick={() => void open()}
        className={cn(
          mode === "fab"
            ? "fixed bottom-5 right-5 z-[60] h-12 w-12 rounded-full"
            : "h-9 w-9 rounded-full",
          "bg-gradient-to-b from-emerald-700 to-emerald-800 text-white shadow-lg",
          "hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
          className,
        )}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <span className="block text-base">💬</span>
      </button>
    ) : null;

  if (state === "closed") return launcher;

  return (
    <>
      {launcher}
      <div
        className="fixed inset-0 z-[60] flex items-end md:items-center justify-end md:justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={close}
      >
        <div
          className="w-full max-w-xl bg-surface-raised rounded-xl border border-border shadow-xl flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
        >
          <header className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-border/60">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle">Whisper</p>
              <h3 className="font-display text-lg text-text mt-0.5">What's on your mind?</h3>
              <p className="text-xs text-text-muted mt-1">
                Goes straight to the team. No bots in between.
              </p>
            </div>
            <button
              onClick={close}
              className="text-text-subtle hover:text-text text-lg leading-none px-2"
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="px-5 py-4 overflow-y-auto space-y-4">
            {state === "thanks" ? (
              <div className="py-12 text-center">
                <p className="font-display text-xl text-text">Thank you 🌱</p>
                <p className="text-sm text-text-muted mt-2">
                  Your whisper was received. We're listening.
                </p>
              </div>
            ) : (
              <>
                <fieldset className="space-y-2">
                  <legend className="text-[11px] uppercase tracking-wider text-text-subtle">
                    What kind of feedback?
                  </legend>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TAGS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTag((prev) => (prev === t.key ? null : t.key))}
                        aria-pressed={tag === t.key}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          tag === t.key
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-surface text-text-muted border-border hover:bg-surface-muted",
                        )}
                      >
                        <span aria-hidden>{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Loved it? Confused? Frustrated? Tell us in your own words."
                  aria-label="Feedback message"
                  className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-text-subtle">
                      Optional annotation
                    </p>
                    <div className="flex items-center gap-1">
                      {TOOLS.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setTool(t.key)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[11px] font-medium border transition-colors",
                            tool === t.key
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-surface text-text-muted border-border hover:bg-surface-muted",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setShapes([])}
                        className="px-2 py-1 rounded-md text-[11px] font-medium border border-border bg-surface text-text-muted hover:bg-surface-muted"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={220}
                    onPointerDown={startDraw}
                    onPointerMove={moveDraw}
                    onPointerUp={endDraw}
                    onPointerCancel={endDraw}
                    className="block w-full border border-border rounded-md touch-none"
                  />
                  <p className="text-[11px] text-text-subtle">
                    {snapshotUrl
                      ? "We've snapshotted the page — circle exactly what you mean."
                      : "Draw a quick mark over the area you're describing. We'll capture the page URL automatically."}
                  </p>
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}
              </>
            )}
          </div>

          {state !== "thanks" && (
            <footer className="px-5 py-4 border-t border-border/60 flex items-center justify-between">
              <p className="text-[11px] text-text-subtle">First human response within 72h.</p>
              <button
                onClick={() => void submit()}
                disabled={state === "submitting"}
                className="inline-flex items-center justify-center gap-2 rounded-md font-medium px-4 h-9 text-sm bg-gradient-to-b from-emerald-700 to-emerald-800 text-white shadow-sm hover:from-emerald-700/90 disabled:opacity-50"
              >
                {state === "submitting" ? "Sending…" : "Send whisper"}
              </button>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}

function drawShape(ctx: CanvasRenderingContext2D, s: DrawnShape) {
  if (s.points.length === 0) return;
  ctx.beginPath();
  if (s.tool === "pen") {
    ctx.moveTo(s.points[0]!.x, s.points[0]!.y);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    return;
  }
  const a = s.points[0]!;
  const b = s.points[s.points.length - 1]!;
  if (s.tool === "circle") {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const rx = Math.abs(b.x - a.x) / 2;
    const ry = Math.abs(b.y - a.y) / 2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (s.tool === "box") {
    ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.fill();
    ctx.stroke();
  } else if (s.tool === "arrow") {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const head = 10;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(
      b.x - head * Math.cos(angle - Math.PI / 6),
      b.y - head * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(
      b.x - head * Math.cos(angle + Math.PI / 6),
      b.y - head * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  }
}
