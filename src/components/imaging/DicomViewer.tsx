"use client";

/**
 * DicomViewer — EMR-140
 *
 * Cornerstone-style DICOM viewer for the clinician imaging workspace. Built
 * to swap in @cornerstonejs/core: the canvas ref binds 1:1 with
 * `cornerstone.enable(canvas)` and the SVG annotation overlay survives the
 * swap unchanged because everything is in canvas-space coordinates.
 *
 * Tools:
 *   • Window/level (drag) — adjusts the synthetic intensity remap
 *   • Zoom (drag-Y) and Pan (drag) — viewport transform
 *   • Arrow / Length (measurement) / Text — annotation tools
 *
 * Annotations are saved by calling `onAnnotationSave`. The parent decides
 * whether that hits the API (`POST /api/imaging/studies/:id/annotations`)
 * or pipes into a local store. The viewer never assumes a network is
 * present so it is safe to mount in tests and storybook.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  SEVERITY_TONE,
  type AnnotationShape,
  type ImagingAnnotation,
  type ImagingStudy,
  type Modality,
  type ReportSeverity,
} from "@/lib/domain/medical-imaging";

const VIEWPORT_PX = 512;
/** mm-per-pixel guess used for the Length tool readout. Real DICOMs ship
 *  PixelSpacing in (0028,0030) — the parser pulls that and the page should
 *  pass it down via the `pixelSpacingMm` prop. */
const DEFAULT_PIXEL_SPACING_MM = 0.6;

type Tool =
  | "windowing"
  | "zoom"
  | "pan"
  | "arrow"
  | "length"
  | "text"
  | "select";

type DraftShape =
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "length"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "text"; x: number; y: number; label: string };

interface DicomViewerProps {
  study: ImagingStudy;
  annotations: ImagingAnnotation[];
  /** Called when the provider commits a new annotation. Parent persists. */
  onAnnotationSave?: (
    annotation: Omit<ImagingAnnotation, "id" | "createdAt" | "studyId">,
  ) => void | Promise<void>;
  /** Called when the provider deletes one of their markers. */
  onAnnotationDelete?: (annotationId: string) => void | Promise<void>;
  /** Author name written onto new annotations. */
  authorName?: string;
  /** mm/px scale used for the Length tool — derived from DICOM PixelSpacing. */
  pixelSpacingMm?: number;
  /** Hide annotation tools entirely (read-only consumers). */
  readOnly?: boolean;
  /** Hide annotation overlay even when annotations exist. */
  showAnnotations?: boolean;
  className?: string;
}

export function DicomViewer({
  study,
  annotations,
  onAnnotationSave,
  onAnnotationDelete,
  authorName = "Provider",
  pixelSpacingMm = DEFAULT_PIXEL_SPACING_MM,
  readOnly = false,
  showAnnotations = true,
  className,
}: DicomViewerProps) {
  const [seriesId, setSeriesId] = React.useState(study.series[0]?.id ?? "");
  const [frame, setFrame] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [windowCenter, setWindowCenter] = React.useState(128);
  const [windowWidth, setWindowWidth] = React.useState(256);
  const [tool, setTool] = React.useState<Tool>("windowing");
  const [severity, setSeverity] = React.useState<ReportSeverity>("minor");
  const [patientVisible, setPatientVisible] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState("");
  const [draft, setDraft] = React.useState<DraftShape | null>(null);
  const [textPrompt, setTextPrompt] = React.useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    startCanvasX: number;
    startCanvasY: number;
    startPan: { x: number; y: number };
    startZoom: number;
    startWC: number;
    startWW: number;
  } | null>(null);

  const series = study.series.find((s) => s.id === seriesId) ?? study.series[0];

  const visibleAnnotations = React.useMemo(() => {
    if (!showAnnotations) return [];
    return annotations.filter(
      (a) => a.seriesId === series?.id && a.frame === frame,
    );
  }, [annotations, series?.id, frame, showAnnotations]);

  // Synthetic frame renderer ───────────────────────────────────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series) return;
    paintFrame({
      canvas,
      modality: study.modality,
      seriesSeed: hash(series.id),
      frame,
      windowCenter,
      windowWidth,
    });
  }, [frame, windowCenter, windowWidth, series, study.modality]);

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setWindowCenter(128);
    setWindowWidth(256);
  };

  // ───────── Pointer + keyboard handling ─────────
  const isDrawingTool = !readOnly && (tool === "arrow" || tool === "length");
  const isTextTool = !readOnly && tool === "text";

  const toCanvasCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEWPORT_PX,
      y: ((e.clientY - rect.top) / rect.height) * VIEWPORT_PX,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = toCanvasCoords(e);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCanvasX: x,
      startCanvasY: y,
      startPan: pan,
      startZoom: zoom,
      startWC: windowCenter,
      startWW: windowWidth,
    };
    if (isDrawingTool) {
      setDraft({ kind: tool === "arrow" ? "arrow" : "length", x1: x, y1: y, x2: x, y2: y });
    } else if (isTextTool) {
      setTextPrompt({ x, y, value: "" });
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = dragRef.current;
    if (!s) return;

    if (isDrawingTool && draft && (draft.kind === "arrow" || draft.kind === "length")) {
      const { x, y } = toCanvasCoords(e);
      setDraft({ ...draft, x2: x, y2: y });
      return;
    }

    const dx = e.clientX - s.startClientX;
    const dy = e.clientY - s.startClientY;
    if (tool === "pan") {
      setPan({ x: s.startPan.x + dx, y: s.startPan.y + dy });
    } else if (tool === "zoom") {
      setZoom(Math.max(0.25, Math.min(4, s.startZoom * (1 + dy * -0.005))));
    } else if (tool === "windowing") {
      setWindowCenter(Math.max(0, Math.min(255, s.startWC + dy * 0.5)));
      setWindowWidth(Math.max(1, Math.min(512, s.startWW + dx * 0.5)));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (isDrawingTool && draft && series && (draft.kind === "arrow" || draft.kind === "length")) {
      const distance = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
      const valid = distance > 8;
      if (valid && onAnnotationSave) {
        const shape: AnnotationShape = {
          kind: "arrow",
          x1: draft.x1,
          y1: draft.y1,
          x2: draft.x2,
          y2: draft.y2,
        };
        const note =
          draft.kind === "length"
            ? `${(distance * pixelSpacingMm).toFixed(1)} mm${draftNote ? ` · ${draftNote}` : ""}`
            : draftNote || undefined;
        void onAnnotationSave({
          seriesId: series.id,
          frame,
          shape,
          author: authorName,
          patientVisible,
          note,
          severity,
        });
        setDraftNote("");
      }
      setDraft(null);
    }
    dragRef.current = null;
  };

  const commitTextAnnotation = () => {
    if (!textPrompt || !series) {
      setTextPrompt(null);
      return;
    }
    const label = textPrompt.value.trim();
    if (label && onAnnotationSave) {
      const shape: AnnotationShape = {
        kind: "text",
        x: textPrompt.x,
        y: textPrompt.y,
      };
      void onAnnotationSave({
        seriesId: series.id,
        frame,
        shape,
        author: authorName,
        patientVisible,
        note: label,
        severity,
      });
    }
    setTextPrompt(null);
  };

  const cursorClass = (() => {
    if (readOnly) return "cursor-default";
    if (tool === "pan") return "cursor-grab active:cursor-grabbing";
    if (tool === "zoom") return "cursor-ns-resize";
    if (tool === "windowing") return "cursor-crosshair";
    if (tool === "text") return "cursor-text";
    return "cursor-crosshair";
  })();

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60 bg-surface-muted/40">
        <select
          value={series?.id}
          onChange={(e) => {
            setSeriesId(e.target.value);
            setFrame(0);
          }}
          className="text-xs h-7 rounded-md border border-border bg-surface px-2"
          aria-label="Select series"
        >
          {study.series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.description} ({s.frameCount})
            </option>
          ))}
        </select>

        <ToolButton label="W/L" title="Window / Level" active={tool === "windowing"} onClick={() => setTool("windowing")} />
        <ToolButton label="Zoom" title="Zoom" active={tool === "zoom"} onClick={() => setTool("zoom")} />
        <ToolButton label="Pan" title="Pan" active={tool === "pan"} onClick={() => setTool("pan")} />

        {!readOnly && (
          <>
            <span className="mx-1 h-5 w-px bg-border/70" aria-hidden />
            <ToolButton label="↗" title="Arrow annotation" active={tool === "arrow"} onClick={() => setTool("arrow")} />
            <ToolButton label="📏" title="Measurement" active={tool === "length"} onClick={() => setTool("length")} />
            <ToolButton label="T" title="Text annotation" active={tool === "text"} onClick={() => setTool("text")} />
          </>
        )}

        <button
          type="button"
          onClick={reset}
          className="text-xs h-7 px-2.5 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
        >
          Reset
        </button>

        <span className="ml-auto text-[11px] text-text-subtle tabular-nums">
          WC {Math.round(windowCenter)} / WW {Math.round(windowWidth)} · Z{" "}
          {zoom.toFixed(2)}×
        </span>
      </div>

      {/* Annotation defaults bar */}
      {!readOnly && (tool === "arrow" || tool === "length" || tool === "text") && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border/60 bg-amber-50/60 text-xs">
          <span className="font-medium text-text">New annotation:</span>
          <label className="flex items-center gap-1.5">
            Severity
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ReportSeverity)}
              className="h-7 rounded-md border border-border bg-surface px-2"
            >
              {(["normal", "minor", "significant", "critical"] as const).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_TONE[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={patientVisible}
              onChange={(e) => setPatientVisible(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            Show to patient
          </label>
          {tool !== "text" && (
            <input
              type="text"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder={
                tool === "length"
                  ? "Optional note (mm distance auto-saved)"
                  : "Optional note"
              }
              className="flex-1 min-w-[180px] h-7 rounded-md border border-border bg-surface px-2 text-xs"
            />
          )}
        </div>
      )}

      {/* Viewport */}
      <div className="relative bg-black aspect-square overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <canvas
            ref={canvasRef}
            width={VIEWPORT_PX}
            height={VIEWPORT_PX}
            className={cn("absolute inset-0 m-auto select-none", cursorClass)}
            style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
          />
          <svg
            viewBox={`0 0 ${VIEWPORT_PX} ${VIEWPORT_PX}`}
            preserveAspectRatio="none"
            className={cn(
              "absolute inset-0 w-full h-full select-none touch-none",
              cursorClass,
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {visibleAnnotations.map((a) => (
              <Marker
                key={a.id}
                annotation={a}
                pixelSpacingMm={pixelSpacingMm}
                interactive={!readOnly}
                onDelete={() => onAnnotationDelete?.(a.id)}
              />
            ))}
            {draft && (draft.kind === "arrow" || draft.kind === "length") && (
              <DraftLine
                draft={draft}
                severity={severity}
                pixelSpacingMm={pixelSpacingMm}
              />
            )}
          </svg>
        </div>

        {textPrompt && (
          <div
            className="absolute z-10"
            style={{
              left: `${(textPrompt.x / VIEWPORT_PX) * 100}%`,
              top: `${(textPrompt.y / VIEWPORT_PX) * 100}%`,
            }}
          >
            <input
              autoFocus
              value={textPrompt.value}
              onChange={(e) =>
                setTextPrompt({ ...textPrompt, value: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTextAnnotation();
                if (e.key === "Escape") setTextPrompt(null);
              }}
              onBlur={commitTextAnnotation}
              placeholder="Label…"
              className="h-7 px-2 rounded-md text-xs bg-white text-black border border-amber-400 shadow-md"
            />
          </div>
        )}

        {/* DICOM-style overlays */}
        <Overlay corner="tl">
          <div>{study.modality}</div>
          <div className="opacity-70">{study.studyDate}</div>
          <div className="opacity-50">{study.bodyPart}</div>
        </Overlay>
        <Overlay corner="tr">
          <div>
            Img {frame + 1} / {series?.frameCount ?? 0}
          </div>
          {series?.sliceThickness && (
            <div className="opacity-70">{series.sliceThickness} mm</div>
          )}
        </Overlay>
        <Overlay corner="bl">R</Overlay>
        <Overlay corner="br">L</Overlay>
      </div>

      {/* Frame scrubber */}
      <div className="px-4 py-2 border-t border-border/60 bg-surface-muted/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFrame((f) => Math.max(0, f - 1))}
            className="text-text-subtle hover:text-text"
            aria-label="Previous frame"
          >
            ◀
          </button>
          <input
            type="range"
            min={0}
            max={(series?.frameCount ?? 1) - 1}
            value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
            className="flex-1 accent-accent"
            aria-label="Frame"
          />
          <button
            type="button"
            onClick={() =>
              setFrame((f) => Math.min((series?.frameCount ?? 1) - 1, f + 1))
            }
            className="text-text-subtle hover:text-text"
            aria-label="Next frame"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Annotation overlays ─────────────────────────────────────────────────

const STROKE_BY_SEVERITY: Record<ReportSeverity, string> = {
  normal: "#10b981",
  minor: "#0ea5e9",
  significant: "#f59e0b",
  critical: "#ef4444",
};

function Marker({
  annotation,
  pixelSpacingMm,
  interactive,
  onDelete,
}: {
  annotation: ImagingAnnotation;
  pixelSpacingMm: number;
  interactive: boolean;
  onDelete?: () => void;
}) {
  const stroke = STROKE_BY_SEVERITY[annotation.severity];
  const fill = stroke + "33";
  const { shape } = annotation;

  return (
    <g>
      {shape.kind === "circle" && (
        <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} stroke={stroke} strokeWidth={2} />
      )}
      {shape.kind === "rect" && (
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} fill={fill} stroke={stroke} strokeWidth={2} />
      )}
      {shape.kind === "arrow" && (
        <Arrow x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={stroke} />
      )}
      {shape.kind === "text" && (
        <g>
          <rect
            x={shape.x - 4}
            y={shape.y - 14}
            width={Math.max(40, (annotation.note?.length ?? 6) * 7)}
            height={18}
            rx={4}
            fill="rgba(0,0,0,0.65)"
            stroke={stroke}
          />
          <text
            x={shape.x}
            y={shape.y}
            fill="#fff"
            fontSize={11}
            fontFamily="ui-sans-serif, system-ui"
          >
            {annotation.note ?? "Note"}
          </text>
        </g>
      )}
      <title>
        {annotation.author} · {annotation.severity}
        {annotation.note ? ` — ${annotation.note}` : ""}
      </title>
      {interactive && (
        <foreignObject
          x={anchorX(annotation) - 10}
          y={anchorY(annotation) - 28}
          width={20}
          height={20}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="h-5 w-5 rounded-full bg-black/70 text-white text-[10px] hover:bg-black"
            aria-label="Delete annotation"
          >
            ×
          </button>
        </foreignObject>
      )}
    </g>
  );
}

function DraftLine({
  draft,
  severity,
  pixelSpacingMm,
}: {
  draft: Extract<DraftShape, { kind: "arrow" | "length" }>;
  severity: ReportSeverity;
  pixelSpacingMm: number;
}) {
  const stroke = STROKE_BY_SEVERITY[severity];
  const length = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
  return (
    <g>
      <Arrow x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke={stroke} dashed />
      {draft.kind === "length" && length > 6 && (
        <text
          x={(draft.x1 + draft.x2) / 2 + 6}
          y={(draft.y1 + draft.y2) / 2 - 6}
          fill="#fff"
          fontSize={11}
          fontFamily="ui-monospace, monospace"
          stroke="black"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {(length * pixelSpacingMm).toFixed(1)} mm
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  stroke,
  dashed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  dashed?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 14;
  const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 7);
  const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 7);
  const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 7);
  const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 7);
  return (
    <g stroke={stroke} fill={stroke}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={2}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} />
    </g>
  );
}

function Overlay({
  corner,
  children,
}: {
  corner: "tl" | "tr" | "bl" | "br";
  children: React.ReactNode;
}) {
  const pos = {
    tl: "top-2 left-3 text-left",
    tr: "top-2 right-3 text-right",
    bl: "bottom-2 left-3",
    br: "bottom-2 right-3",
  }[corner];
  return (
    <div
      className={cn(
        "absolute font-mono text-[11px] text-white/80 leading-tight pointer-events-none",
        pos,
      )}
    >
      {children}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "text-xs h-7 px-2.5 rounded-md transition-colors min-w-[2.25rem]",
        active
          ? "bg-accent-soft text-accent"
          : "text-text-muted hover:text-text hover:bg-surface-muted",
      )}
    >
      {label}
    </button>
  );
}

function anchorX(a: ImagingAnnotation): number {
  if (a.shape.kind === "circle") return a.shape.cx + a.shape.r;
  if (a.shape.kind === "rect") return a.shape.x + a.shape.w;
  if (a.shape.kind === "arrow") return a.shape.x2;
  return a.shape.x;
}
function anchorY(a: ImagingAnnotation): number {
  if (a.shape.kind === "circle") return a.shape.cy - a.shape.r;
  if (a.shape.kind === "rect") return a.shape.y;
  if (a.shape.kind === "arrow") return a.shape.y2;
  return a.shape.y;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function paintFrame(opts: {
  canvas: HTMLCanvasElement;
  modality: Modality;
  seriesSeed: number;
  frame: number;
  windowCenter: number;
  windowWidth: number;
}) {
  const { canvas, modality, seriesSeed, frame, windowCenter, windowWidth } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) * 0.45;

  const lo = windowCenter - windowWidth / 2;
  const hi = windowCenter + windowWidth / 2;

  const img = ctx.createImageData(w, h);
  const data = img.data;
  const seed = seriesSeed + (frame + 1) * 7919;
  const lowContrast = modality === "US" || modality === "XR";
  const tint = MODALITY_TINT[modality];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const ring = Math.cos((r / maxR) * Math.PI * 3) * 60;
      const ridge = Math.sin(dx / 40 + frame * 0.1) * 25;
      const rumble = Math.sin(dy / 30 + frame * 0.07) * 25;
      const noise =
        (((x * 31 + y * 17 + seed) * 2654435761) >>> 0) %
        (lowContrast ? 50 : 30);
      const inside = r < maxR ? 1 : 0;
      const raw =
        inside * (180 - (r / maxR) * 120 + ring + ridge + rumble) + noise;
      let v = ((raw - lo) / (hi - lo)) * 255;
      v = Math.max(0, Math.min(255, v));
      const idx = (y * w + x) * 4;
      data[idx] = v * tint[0];
      data[idx + 1] = v * tint[1];
      data[idx + 2] = v * tint[2];
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const MODALITY_TINT: Record<Modality, [number, number, number]> = {
  CT: [1, 1, 1],
  MR: [0.95, 0.97, 1.0],
  XR: [1, 0.98, 0.94],
  US: [0.9, 0.95, 1],
  PT: [1.0, 0.85, 0.7],
  MG: [1, 0.97, 0.95],
  NM: [0.85, 1, 0.9],
};
