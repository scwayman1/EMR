"use client";

import { useRef, useState } from "react";
import { Download, Share2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { MiniGarden } from "@/components/ui/mini-garden";
import { cn } from "@/lib/utils/cn";

export type PlantShareCardProps = {
  firstName: string;
  score: number;
  leafCount: number;
  stageLabel: string;
  className?: string;
};

const MAX_LEAVES = 9;

export function PlantShareCard({
  firstName,
  score,
  leafCount,
  stageLabel,
  className,
}: PlantShareCardProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grown = Math.min(MAX_LEAVES, Math.max(0, leafCount));

  const capture = async (): Promise<Blob | null> => {
    if (!captureRef.current) return null;
    // Render at 2x for a crisp 2160px export from the 1080px source.
    const canvas = await html2canvas(captureRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0),
    );
  };

  const filename = `${firstName.toLowerCase().replace(/\s+/g, "-") || "my"}-garden-leafjourney.png`;

  const onDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await capture();
      if (!blob) throw new Error("Capture failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save image");
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await capture();
      if (!blob) throw new Error("Capture failed");
      const file = new File([blob], filename, { type: "image/png" });
      const shareData: ShareData = {
        title: `${firstName}'s garden — Leafjourney`,
        text: `${stageLabel} · Health score ${score}/100`,
        files: [file],
      };
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share(shareData);
      } else {
        await onDownload();
      }
    } catch (err) {
      // User-cancelled share is normal; only surface real failures.
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Inline preview — scaled-down version of the capture target */}
      <div className="rounded-3xl overflow-hidden shadow-xl border border-border bg-[#0F2A1F]">
        <div
          className="origin-top-left"
          style={{
            transform: "scale(0.28)",
            transformOrigin: "top left",
            width: 1080,
            height: 1080,
            marginBottom: 1080 * (0.28 - 1),
            marginRight: 1080 * (0.28 - 1),
          }}
        >
          <ShareCardArtwork
            firstName={firstName}
            score={score}
            leafCount={grown}
            stageLabel={stageLabel}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center gap-2 h-11 rounded-full px-5 text-sm font-semibold text-white",
            "bg-accent shadow-md transition-all",
            "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
            "disabled:opacity-60 disabled:translate-y-0",
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Share2 className="h-4 w-4" strokeWidth={2.5} />
          )}
          Share my garden
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-text hover:bg-surface-muted transition-colors disabled:opacity-60"
        >
          <Download className="h-4 w-4" strokeWidth={2.25} />
          Download PNG
        </button>
      </div>

      {error && (
        <p className="text-xs text-[color:var(--danger)]">{error}</p>
      )}

      {/* Off-screen full-size capture target. Kept rendered so html2canvas
          can sample real layout without flicker. */}
      <div
        aria-hidden
        className="fixed pointer-events-none"
        style={{ left: -99999, top: 0, width: 1080, height: 1080 }}
      >
        <div ref={captureRef}>
          <ShareCardArtwork
            firstName={firstName}
            score={score}
            leafCount={grown}
            stageLabel={stageLabel}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The 1080×1080 Instagram-square artwork. Uses only hex colors, system
 * fonts, and basic CSS so html2canvas captures it faithfully — no
 * `oklch`, `color-mix`, `backdrop-filter`, or CSS variables here.
 */
function ShareCardArtwork({
  firstName,
  score,
  leafCount,
  stageLabel,
}: {
  firstName: string;
  score: number;
  leafCount: number;
  stageLabel: string;
}) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(160deg, #0F2A1F 0%, #1F4D37 55%, #3A8560 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#F5F0E3",
      }}
    >
      {/* Texture orbs */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          right: -220,
          top: -180,
          background: "radial-gradient(circle, rgba(123, 199, 155, 0.35) 0%, rgba(123, 199, 155, 0) 65%)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          left: -180,
          bottom: -180,
          background: "radial-gradient(circle, rgba(244, 208, 111, 0.18) 0%, rgba(244, 208, 111, 0) 65%)",
          borderRadius: "50%",
        }}
      />

      {/* Top: brand */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          right: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "rgba(245, 240, 227, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            🌿
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Leafjourney
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "system-ui" }}>
              My Garden
            </div>
          </div>
        </div>
      </div>

      {/* Center: plant */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: "50%",
          transform: "translateX(-50%)",
          width: 540,
          height: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MiniGarden grown={leafCount} className="w-full h-full" />
      </div>

      {/* Bottom: stats */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 80,
        }}
      >
        <div
          style={{
            fontSize: 18,
            opacity: 0.75,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "system-ui",
            marginBottom: 14,
          }}
        >
          {firstName ? `${firstName}'s garden` : "A garden in progress"}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            marginBottom: 22,
          }}
        >
          {stageLabel}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontFamily: "system-ui",
          }}
        >
          <Stat label="Health score" value={`${score}`} suffix="/100" />
          <Stat label="Leaves grown" value={`${leafCount}`} suffix={`/${MAX_LEAVES}`} />
        </div>
      </div>

      {/* Footer hairline */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 60,
          right: 60,
          fontSize: 12,
          fontFamily: "system-ui",
          opacity: 0.6,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        leafjourney · personalized cannabis care
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(245, 240, 227, 0.10)",
        border: "1px solid rgba(245, 240, 227, 0.18)",
        borderRadius: 22,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 42, fontWeight: 600, fontFamily: "Georgia, serif", letterSpacing: "-0.01em" }}>
        {value}
        {suffix && <span style={{ fontSize: 22, opacity: 0.55, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
}
