import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Small SVG sparkline with a soft area fill beneath the line. No chart
 * library — keeps the aesthetic tightly controlled and the bundle light.
 */
export function Sparkline({
  data,
  width = 180,
  height = 48,
  color = "var(--accent)",
  fill = "var(--accent-soft)",
  showDots = true,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  showDots?: boolean;
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

  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = innerW / (data.length - 1);

  const pts = data.map((v, i) => {
    const x = padding + i * step;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;

  const last = pts[pts.length - 1];
  const gradientId = React.useId().replace(/:/g, "");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${gradientId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={line}
      />
      {showDots && (
        <circle
          cx={last.x}
          cy={last.y}
          r="3.25"
          fill={color}
          stroke="var(--surface-raised)"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
