import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tiny SVG sparkline. No external charting lib in V1 — this keeps the
 * bundle light and the aesthetic tightly controlled.
 */
export function Sparkline({
  data,
  width = 160,
  height = 40,
  color = "var(--accent)",
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (data.length < 2) {
    return (
      <div
        className={cn("text-xs text-text-subtle", className)}
        style={{ width, height, display: "flex", alignItems: "center" }}
      >
        Not enough data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
