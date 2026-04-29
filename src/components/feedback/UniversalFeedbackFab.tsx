"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

// EMR-128 — universal feedback FAB. Mounted once at the root layout so
// every route in every role sees the same pulse-of-the-product channel.
//
// The annotation canvas is intentionally a lightweight sketch surface;
// when the in-browser screenshot capture lib lands (html2canvas/snapshot)
// we rasterize the page to the same canvas before the user draws on it.
// Until then the user draws over a blank backdrop with a subtle viewport
// outline so they can still circle a region.

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

export function UniversalFeedbackFab() {
  const [state, setState] = useState<State>("closed");
  const [comment, setComment] = useState("");
  const [tool, setTool] = useState<Tool>("pen");
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [drawing, setDrawing] = useState<DrawnShape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persist a stable client-id per browser to dedupe repeats / retries.
  const clientIdRef = useRef<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    let id = window.localStorage.getItem("lj-whisper-client-id");
    if (!id) {
      id = `wcid-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      window.localStorage.setItem("lj-whisper-client-id", id);
    }
    clientIdRef.current = id;
  }, []);

  // Re-render the canvas whenever shapes change.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    // Subtle viewport outline so the canvas isn't just empty space.
    ctx.fillStyle = "rgba(63, 110, 79, 0.04)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(63, 110, 79, 0.2)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
    ctx.setLineDash([]);

    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.fillStyle = "rgba(192, 57, 43, 0.15)";

    const all = drawing ? [...shapes, drawing] : shapes;
    for (const s of all) {
      drawShape(ctx, s);
    }
  }, [shapes, drawing]);

  function open() {
    setState("form");
    setError(null);
  }
  function close() {
    setState("closed");
    setComment("");
    setShapes([]);
    setDrawing(null);
    setError(null);
  }

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
      const annotationDataUrl = canvasRef.current?.toDataURL("image/png");
      const payload = {
        clientId: clientIdRef.current,
        pageUrl: window.location.href,
        comment,
        annotationDataUrl: shapes.length > 0 ? annotationDataUrl : undefined,
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        occurredAt: new Date().toISOString(),
      };
      const res = await fetch("/api/feedback/whisper", {
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

  if (state === "closed") {
    return (
      <button
        type="button"
        onClick={open}
        className={cn(
          "fixed bottom-5 right-5 z-[60] h-12 w-12 rounded-full",
          "bg-gradient-to-b from-emerald-700 to-emerald-800 text-white shadow-lg",
          "hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
        )}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <span className="block text-base">💬</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-end md:justify-center bg-black/40 backdrop-blur-sm p-4" onClick={close}>
      <div
        className="w-full max-w-xl bg-surface-raised rounded-xl border border-border shadow-xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-border/60">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-subtle">Whisper</p>
            <h3 className="font-display text-lg text-text mt-0.5">What's on your mind?</h3>
            <p className="text-xs text-text-muted mt-1">
              Goes straight to Dr. Patel & Scott. No bots in between.
            </p>
          </div>
          <button onClick={close} className="text-text-subtle hover:text-text text-lg leading-none px-2" aria-label="Close">
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
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Loved it? Confused? Frustrated? Tell us in your own words."
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-text-subtle">Optional annotation</p>
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
                  height={200}
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerCancel={endDraw}
                  className="block w-full border border-border rounded-md touch-none"
                />
                <p className="text-[11px] text-text-subtle">
                  Mark exactly what you mean. We'll capture the page URL automatically.
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
              onClick={submit}
              disabled={state === "submitting"}
              className="inline-flex items-center justify-center gap-2 rounded-md font-medium px-4 h-9 text-sm bg-gradient-to-b from-emerald-700 to-emerald-800 text-white shadow-sm hover:from-emerald-700/90 disabled:opacity-50"
            >
              {state === "submitting" ? "Sending…" : "Send whisper"}
            </button>
          </footer>
        )}
      </div>
    </div>
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
    ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }
}
