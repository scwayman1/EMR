"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Numeric portion to count up to. */
  value: number;
  /** Optional suffix kept after the number (e.g. "+", "%"). */
  suffix?: string;
  /** Use this instead of `value` when the label isn't numeric (e.g. "HIPAA"). */
  staticLabel?: string;
  /** Animation duration in ms. */
  durationMs?: number;
  className?: string;
};

export function AnimatedCounter({
  value,
  suffix = "",
  staticLabel,
  durationMs = 1400,
  className,
}: Props) {
  const [display, setDisplay] = useState(staticLabel ? staticLabel : "0");
  const ref = useRef<HTMLSpanElement | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (staticLabel) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || triggered.current) continue;
          triggered.current = true;
          observer.disconnect();

          const start = performance.now();
          const ease = (t: number) => 1 - Math.pow(1 - t, 3);

          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const current = Math.round(ease(t) * value);
            setDisplay(`${current}${suffix}`);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, suffix, staticLabel, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
