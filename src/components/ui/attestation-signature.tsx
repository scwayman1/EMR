"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface AttestationSignatureProps {
  providerName: string;
  /** Attestation statement — default used if not provided */
  statement?: string;
  onConfirm: (signatureDataUrl: string) => void;
  className?: string;
}

/**
 * Canvas-based signature pad for note attestation. Supports mouse and touch.
 * Calls `onConfirm` with a base64 PNG data URL.
 */
export function AttestationSignature({
  providerName,
  statement,
  onConfirm,
  className,
}: AttestationSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const defaultStatement = `I, ${providerName}, attest that the information in this note is accurate, complete to the best of my knowledge, and reflects the care I personally provided or supervised.`;
  const displayStatement = statement ?? defaultStatement;

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0f172a";
    return ctx;
  }, []);

  // Resize canvas to its display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
  }, []);

  function pointerPos(
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointerPos(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const p = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    if (!hasInk) setHasInk(true);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-raised p-5 space-y-4",
        className,
      )}
    >
      <div>
        <p className="text-[11px] uppercase tracking-wider text-text-subtle font-medium mb-1.5">
          Provider attestation
        </p>
        <p className="text-sm text-text leading-relaxed">{displayStatement}</p>
      </div>

      <div className="relative rounded-lg border border-dashed border-border-strong bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 block touch-none rounded-lg cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {!hasInk && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-subtle">
            Sign here
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-subtle">
          Signature captured as PNG; timestamped on confirm.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" onClick={confirm} disabled={!hasInk}>
            Confirm signature
          </Button>
        </div>
      </div>
    </div>
  );
}
