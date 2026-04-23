"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface CelebrationProps {
  show: boolean;
  message?: string;
  emoji?: string;
  /** Called once the auto-dismiss timer fires. */
  onDone?: () => void;
}

const CONFETTI_COLORS = [
  "#047857",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#ec4899",
  "#facc15",
  "#14b8a6",
];

const CONFETTI_COUNT = 30;

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  delay: number;
  size: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    angle: (i / CONFETTI_COUNT) * 360 + Math.random() * 15,
    distance: 120 + Math.random() * 140,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 120,
    size: 6 + Math.random() * 6,
  }));
}

/**
 * Celebration — full-screen overlay showing confetti + a big emoji +
 * a "Nice work!" message. Auto-dismisses 3s after `show` becomes true.
 *
 * Pure CSS-only confetti (no external deps). Respects reduce-motion
 * via the global `.reduce-motion` class when set.
 */
export function Celebration({
  show,
  message = "Nice work!",
  emoji = "🎉",
  onDone,
}: CelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!show) return;
    setParticles(makeParticles());
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [show, onDone]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center pointer-events-none",
        "animate-[celebrationFade_3s_ease-out_forwards]"
      )}
    >
      <style>{`
        @keyframes celebrationFade {
          0% { opacity: 0; }
          10% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes celebrationBurst {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% {
            transform:
              translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, 0px)))
              rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes celebrationPop {
          0% { transform: scale(0.3); opacity: 0; }
          40% { transform: scale(1.15); opacity: 1; }
          60% { transform: scale(1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .reduce-motion [data-lj-celebration] * {
          animation: none !important;
        }
      `}</style>

      <div data-lj-celebration className="relative flex flex-col items-center gap-3">
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            return (
              <span
                key={p.id}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: p.color,
                  transform: "translate(-50%, -50%)",
                  animation: `celebrationBurst 2s cubic-bezier(0.22, 1, 0.36, 1) ${p.delay}ms forwards`,
                  ["--tx" as string]: `${tx}px`,
                  ["--ty" as string]: `${ty}px`,
                }}
              />
            );
          })}
        </div>

        {/* Big emoji + message */}
        <div
          className="relative z-10 flex flex-col items-center gap-2 rounded-2xl bg-surface-raised/95 backdrop-blur px-8 py-6 shadow-2xl border border-border"
          style={{ animation: "celebrationPop 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
        >
          <span className="text-6xl leading-none" aria-hidden="true">
            {emoji}
          </span>
          <p className="font-display text-xl text-text tracking-tight">{message}</p>
        </div>
      </div>
    </div>
  );
}
