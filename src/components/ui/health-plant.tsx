"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { PlantHealth } from "@/lib/domain/plant-health";

// ---------------------------------------------------------------------------
// HealthPlant — a living SVG cannabis plant that reflects patient health.
//
// The plant grows from a humble terracotta pot: stems reach upward, fan
// leaves unfurl, and — when the patient is truly engaged — small flowers
// bloom at the tips. Every visual property (height, color, leaf count,
// bloom) derives from the PlantHealth state.
// ---------------------------------------------------------------------------

type PlantSize = "sm" | "md" | "lg";

const DIMENSIONS: Record<PlantSize, { width: number; height: number }> = {
  sm: { width: 80, height: 120 },
  md: { width: 160, height: 240 },
  lg: { width: 240, height: 360 },
};

const LEAF_COLORS: Record<PlantHealth["leafColor"], string> = {
  brown: "#8B6F47",
  yellow: "#C4A23A",
  "light-green": "#6DAF6D",
  green: "#3A8560",
  "deep-green": "#1F4D37",
};

const SOIL_COLORS: Record<PlantHealth["leafColor"], { light: string; dark: string }> = {
  brown: { light: "#A08060", dark: "#6B5040" },
  yellow: { light: "#8B7040", dark: "#5C4A2A" },
  "light-green": { light: "#6B5535", dark: "#4A3A22" },
  green: { light: "#5A4830", dark: "#3D2E1A" },
  "deep-green": { light: "#4A3D28", dark: "#2E2218" },
};

interface HealthPlantProps {
  health: PlantHealth;
  size?: PlantSize;
  className?: string;
}

export function HealthPlant({ health, size = "md", className }: HealthPlantProps) {
  const { width, height } = DIMENSIONS[size];
  const leafColor = LEAF_COLORS[health.leafColor];
  const stemColor = "#2A5E3F";
  const soil = SOIL_COLORS[health.leafColor];

  // Viewbox is always 240x360 — we scale via width/height.
  const vw = 240;
  const vh = 360;

  // Plant geometry derived from health state.
  const potTop = vh - 90; // y where the pot rim sits
  const maxStemHeight = 200;
  const stemHeight = 40 + (maxStemHeight - 40) * (health.stemCount / 5);
  const stemBase = potTop - 8; // stem emerges just above soil line
  const stemTop = stemBase - stemHeight;

  // Weather / mood state
  const isHealthy = health.score >= 60;
  const isThriving = health.stage === "thriving";
  const isStruggling = health.score < 30;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      role="img"
      aria-label={`Cannabis plant in ${health.stage} stage with a score of ${health.score}`}
    >
      {/* ---- CSS Animations embedded ---- */}
      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2.5deg); }
          75% { transform: rotate(-2.5deg); }
        }
        @keyframes sway-reverse {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes droplet-fall {
          0% { opacity: 0.9; transform: translateY(0); }
          80% { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(60px); }
        }
        @keyframes sun-pulse {
          0%, 100% { r: 28; opacity: 0.9; }
          50% { r: 32; opacity: 1; }
        }
        @keyframes sun-ray-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cloud-drift {
          0% { transform: translateX(-10px); opacity: 0.6; }
          50% { transform: translateX(10px); opacity: 0.8; }
          100% { transform: translateX(-10px); opacity: 0.6; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes water-pour {
          0% { opacity: 0; transform: translateY(-8px); }
          20% { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(30px); }
        }
        @keyframes wilt-droop {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes raindrop {
          0% { opacity: 0; transform: translateY(-20px); }
          30% { opacity: 0.5; }
          100% { opacity: 0; transform: translateY(80px); }
        }
        .plant-sway {
          animation: sway 4s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .plant-sway-reverse {
          animation: sway-reverse 5s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .plant-wilt {
          animation: wilt-droop 6s ease-in-out infinite;
          transform-origin: bottom center;
        }
      `}</style>

      <defs>
        {/* Pot gradient — warm terracotta */}
        <linearGradient id="pot-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4854A" />
          <stop offset="50%" stopColor="#B8782F" />
          <stop offset="100%" stopColor="#9A6220" />
        </linearGradient>

        {/* Pot rim highlight */}
        <linearGradient id="pot-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4944F" />
          <stop offset="100%" stopColor="#B8782F" />
        </linearGradient>

        {/* Soil gradient */}
        <linearGradient id="soil-grad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={soil.light} />
          <stop offset="100%" stopColor={soil.dark} />
        </linearGradient>

        {/* Thriving glow */}
        {health.stage === "thriving" && (
          <radialGradient id="thrive-glow" cx="0.5" cy="0.4" r="0.5">
            <stop offset="0%" stopColor="#3A8560" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#3A8560" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3A8560" stopOpacity="0" />
          </radialGradient>
        )}

        {/* Leaf gradient for depth */}
        <linearGradient id="leaf-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={leafColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={leafColor} stopOpacity="0.7" />
        </linearGradient>

        {/* Flower gradient */}
        <radialGradient id="flower-fill" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#C084D8" />
          <stop offset="60%" stopColor="#9B59B6" />
          <stop offset="100%" stopColor="#7D3F9B" />
        </radialGradient>

        {/* Amber flower accent */}
        <radialGradient id="flower-amber" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#D4944F" />
          <stop offset="100%" stopColor="#B8782F" />
        </radialGradient>
      </defs>

      {/* ---- Weather: Sun for healthy plants ---- */}
      {isHealthy && (
        <g>
          {/* Sun glow */}
          <circle
            cx={42}
            cy={42}
            r={28}
            fill="#F6D365"
            opacity={0.85}
          >
            <animate attributeName="r" values="28;32;28" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Sun outer halo */}
          <circle cx={42} cy={42} r={40} fill="#F6D365" opacity={0.15}>
            <animate attributeName="r" values="38;44;38" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* Sun rays — rotating */}
          <g style={{ transformOrigin: "42px 42px", animation: "sun-ray-spin 20s linear infinite" }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 42 + Math.cos(rad) * 34;
              const y1 = 42 + Math.sin(rad) * 34;
              const x2 = 42 + Math.cos(rad) * 42;
              const y2 = 42 + Math.sin(rad) * 42;
              return (
                <line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#F6D365"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              );
            })}
          </g>
        </g>
      )}

      {/* ---- Weather: Clouds for struggling plants ---- */}
      {isStruggling && (
        <g style={{ animation: "cloud-drift 8s ease-in-out infinite" }}>
          <ellipse cx={60} cy={30} rx={30} ry={14} fill="#9CA3AF" opacity={0.5} />
          <ellipse cx={80} cy={24} rx={22} ry={12} fill="#9CA3AF" opacity={0.45} />
          <ellipse cx={45} cy={26} rx={18} ry={10} fill="#9CA3AF" opacity={0.4} />
        </g>
      )}
      {isStruggling && (
        <g style={{ animation: "cloud-drift 10s ease-in-out infinite", animationDelay: "2s" }}>
          <ellipse cx={170} cy={35} rx={26} ry={12} fill="#9CA3AF" opacity={0.45} />
          <ellipse cx={190} cy={30} rx={20} ry={10} fill="#9CA3AF" opacity={0.4} />
        </g>
      )}

      {/* ---- Rain for struggling plants ---- */}
      {isStruggling && (
        <g opacity={0.4}>
          {[50, 80, 110, 140, 170, 65, 95, 125, 155].map((x, i) => (
            <line
              key={`rain-${i}`}
              x1={x}
              y1={50 + (i % 3) * 10}
              x2={x - 3}
              y2={60 + (i % 3) * 10}
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeLinecap="round"
              opacity={0.6}
            >
              <animate
                attributeName="y1"
                values={`${50 + (i % 3) * 10};${130 + (i % 3) * 10}`}
                dur={`${1.5 + (i % 4) * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values={`${60 + (i % 3) * 10};${140 + (i % 3) * 10}`}
                dur={`${1.5 + (i % 4) * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0.3;0"
                dur={`${1.5 + (i % 4) * 0.3}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </g>
      )}

      {/* ---- Thriving aura ---- */}
      {health.stage === "thriving" && (
        <ellipse
          cx={vw / 2}
          cy={stemTop + stemHeight * 0.35}
          rx={110}
          ry={140}
          fill="url(#thrive-glow)"
          className="animate-pulse"
          style={{ animationDuration: "4s" }}
        />
      )}

      {/* ---- Sparkles for thriving plants ---- */}
      {isThriving && (
        <g>
          {[
            { cx: 80, cy: stemTop + 20, delay: "0s", dur: "2.5s" },
            { cx: 165, cy: stemTop + 50, delay: "0.8s", dur: "3s" },
            { cx: 100, cy: stemTop - 10, delay: "1.5s", dur: "2.8s" },
            { cx: 150, cy: stemTop + 80, delay: "2.2s", dur: "2.2s" },
            { cx: 70, cy: stemTop + 60, delay: "0.5s", dur: "3.2s" },
            { cx: 175, cy: stemTop + 30, delay: "1.8s", dur: "2.6s" },
          ].map((s, i) => (
            <g key={`sparkle-${i}`} style={{ animation: `sparkle ${s.dur} ease-in-out infinite`, animationDelay: s.delay }}>
              <circle cx={s.cx} cy={s.cy} r={2} fill="#F6D365" />
              <line x1={s.cx - 4} y1={s.cy} x2={s.cx + 4} y2={s.cy} stroke="#F6D365" strokeWidth={0.8} />
              <line x1={s.cx} y1={s.cy - 4} x2={s.cx} y2={s.cy + 4} stroke="#F6D365" strokeWidth={0.8} />
            </g>
          ))}
        </g>
      )}

      {/* ---- Watering can animation for healthy plants ---- */}
      {isHealthy && !isThriving && (
        <g>
          {/* Watering can silhouette */}
          <g opacity={0.3}>
            <rect x={vw - 55} y={potTop - 30} width={20} height={14} rx={3} fill="#6B9BD2" />
            <rect x={vw - 40} y={potTop - 26} width={12} height={4} rx={2} fill="#6B9BD2" />
          </g>
          {/* Water drops */}
          {[0, 1, 2].map((j) => (
            <ellipse
              key={`water-${j}`}
              cx={vw - 38 + j * 4}
              cy={potTop - 14}
              rx={1.5}
              ry={2.5}
              fill="#6BB8E0"
              opacity={0.6}
            >
              <animate
                attributeName="cy"
                values={`${potTop - 14};${potTop + 10}`}
                dur={`${1.2 + j * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.7;0.3;0"
                dur={`${1.2 + j * 0.3}s`}
                repeatCount="indefinite"
              />
            </ellipse>
          ))}
        </g>
      )}

      {/* ---- Main stem + leaves + flowers (with sway animation) ---- */}
      <g className={isStruggling ? "plant-wilt" : isHealthy ? "plant-sway" : ""} style={{ transformOrigin: `${vw / 2}px ${stemBase}px` }}>
        <Stem
          x={vw / 2}
          yBottom={stemBase}
          yTop={stemTop}
          color={stemColor}
          thickness={health.stemCount >= 3 ? 4 : 3}
        />

        {/* ---- Secondary stems (branches) ---- */}
        {health.stemCount >= 2 && (
          <Branch
            originX={vw / 2}
            originY={stemBase - stemHeight * 0.35}
            angle={-35}
            length={stemHeight * 0.28}
            color={stemColor}
          />
        )}
        {health.stemCount >= 3 && (
          <Branch
            originX={vw / 2}
            originY={stemBase - stemHeight * 0.5}
            angle={32}
            length={stemHeight * 0.25}
            color={stemColor}
          />
        )}
        {health.stemCount >= 4 && (
          <Branch
            originX={vw / 2}
            originY={stemBase - stemHeight * 0.65}
            angle={-28}
            length={stemHeight * 0.22}
            color={stemColor}
          />
        )}
        {health.stemCount >= 5 && (
          <Branch
            originX={vw / 2}
            originY={stemBase - stemHeight * 0.78}
            angle={30}
            length={stemHeight * 0.2}
            color={stemColor}
          />
        )}

        {/* ---- Leaves (sway independently) ---- */}
        <g className="plant-sway-reverse" style={{ transformOrigin: `${vw / 2}px ${stemBase - stemHeight * 0.5}px` }}>
          <PlantLeaves
            centerX={vw / 2}
            stemBase={stemBase}
            stemHeight={stemHeight}
            leafCount={health.leafCount}
            leafColor={leafColor}
            stemCount={health.stemCount}
          />
        </g>

        {/* ---- Flowers (with gentle bounce) ---- */}
      {health.hasFlowers && (
        <>
          <Flower cx={vw / 2} cy={stemTop + 4} size={10} />
          {health.stemCount >= 2 && (
            <Flower
              cx={vw / 2 - stemHeight * 0.28 * Math.cos((35 * Math.PI) / 180) + 2}
              cy={stemBase - stemHeight * 0.35 - stemHeight * 0.28 * Math.sin((35 * Math.PI) / 180)}
              size={7}
              variant="amber"
            />
          )}
          {health.stemCount >= 3 && (
            <Flower
              cx={vw / 2 + stemHeight * 0.25 * Math.cos((32 * Math.PI) / 180) - 2}
              cy={stemBase - stemHeight * 0.5 - stemHeight * 0.25 * Math.sin((32 * Math.PI) / 180)}
              size={8}
            />
          )}
        </>
      )}
      </g>{/* end sway group */}

      {/* ---- Pot ---- */}
      <Pot potTop={potTop} vw={vw} vh={vh} />

      {/* ---- Soil ---- */}
      <ellipse
        cx={vw / 2}
        cy={potTop + 4}
        rx={52}
        ry={10}
        fill="url(#soil-grad)"
      />
      {/* Tiny sprout indicator for seed stage */}
      {health.stage === "seed" && (
        <ellipse
          cx={vw / 2}
          cy={potTop}
          rx={4}
          ry={3}
          fill="#6DAF6D"
          opacity={0.7}
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stem({
  x,
  yBottom,
  yTop,
  color,
  thickness,
}: {
  x: number;
  yBottom: number;
  yTop: number;
  color: string;
  thickness: number;
}) {
  // Slight organic curve.
  const cpx = x + 3;
  const cpy = yBottom - (yBottom - yTop) * 0.5;
  return (
    <path
      d={`M ${x} ${yBottom} Q ${cpx} ${cpy} ${x} ${yTop}`}
      stroke={color}
      strokeWidth={thickness}
      strokeLinecap="round"
      fill="none"
      style={{
        transition: "d 800ms ease-in-out",
      }}
    />
  );
}

function Branch({
  originX,
  originY,
  angle,
  length,
  color,
}: {
  originX: number;
  originY: number;
  angle: number; // degrees, negative = left
  length: number;
  color: string;
}) {
  const rad = (angle * Math.PI) / 180;
  const endX = originX + Math.cos(rad) * length * (angle < 0 ? -1 : 1);
  const endY = originY - Math.sin(Math.abs(rad)) * length;
  const cpX = originX + (endX - originX) * 0.5;
  const cpY = originY - length * 0.15;

  return (
    <path
      d={`M ${originX} ${originY} Q ${cpX} ${cpY} ${endX} ${endY}`}
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
      opacity={0.85}
    />
  );
}

/** Cannabis fan leaf — 5 or 7 serrated fingers radiating from a petiole. */
function CannabisLeaf({
  cx,
  cy,
  scale,
  rotation,
  color,
  mirror,
}: {
  cx: number;
  cy: number;
  scale: number;
  rotation: number;
  color: string;
  mirror?: boolean;
}) {
  const sx = mirror ? -scale : scale;
  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotation}) scale(${sx}, ${scale})`}
      opacity={0.88}
      style={{ transition: "opacity 600ms ease-in-out" }}
    >
      {/* Central finger */}
      <path
        d="M 0 0 C -2 -10, -3 -20, 0 -28 C 3 -20, 2 -10, 0 0 Z"
        fill={color}
      />
      {/* Inner pair */}
      <path
        d="M 0 -2 C -6 -12, -10 -18, -7 -24 C -4 -18, -2 -12, 0 -2 Z"
        fill={color}
        opacity={0.9}
      />
      <path
        d="M 0 -2 C 6 -12, 10 -18, 7 -24 C 4 -18, 2 -12, 0 -2 Z"
        fill={color}
        opacity={0.9}
      />
      {/* Outer pair */}
      <path
        d="M 0 0 C -8 -6, -14 -12, -13 -19 C -9 -14, -4 -8, 0 0 Z"
        fill={color}
        opacity={0.75}
      />
      <path
        d="M 0 0 C 8 -6, 14 -12, 13 -19 C 9 -14, 4 -8, 0 0 Z"
        fill={color}
        opacity={0.75}
      />
      {/* Petiole (tiny stem) */}
      <line x1={0} y1={0} x2={0} y2={6} stroke={color} strokeWidth={1} opacity={0.6} />
      {/* Central vein */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-26}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.4}
      />
    </g>
  );
}

function PlantLeaves({
  centerX,
  stemBase,
  stemHeight,
  leafCount,
  leafColor,
  stemCount,
}: {
  centerX: number;
  stemBase: number;
  stemHeight: number;
  leafCount: number;
  leafColor: string;
  stemCount: number;
}) {
  if (leafCount === 0) return null;

  // Place leaves along the stem and branches.
  const positions: Array<{
    x: number;
    y: number;
    scale: number;
    rotation: number;
    mirror: boolean;
  }> = [];

  // Distribute leaves from bottom to top of the stem with alternating sides.
  const mainStemLeaves = Math.min(leafCount, 8);
  for (let i = 0; i < mainStemLeaves; i++) {
    const t = 0.15 + (i / Math.max(mainStemLeaves - 1, 1)) * 0.75;
    const y = stemBase - stemHeight * t;
    const side = i % 2 === 0 ? -1 : 1;
    const offset = 12 + (1 - t) * 8; // leaves wider at bottom
    positions.push({
      x: centerX + side * offset,
      y,
      scale: 0.65 + (1 - t) * 0.45, // bigger at bottom
      rotation: side * (15 + t * 20),
      mirror: side < 0,
    });
  }

  // Extra leaves on branches if we have more than 8.
  if (leafCount > 8 && stemCount >= 2) {
    const branchLeafCount = leafCount - 8;
    const branchPositions: Array<{
      x: number;
      y: number;
      scale: number;
      rotation: number;
      mirror: boolean;
    }> = [
      {
        x: centerX - stemHeight * 0.18,
        y: stemBase - stemHeight * 0.38,
        scale: 0.5,
        rotation: -30,
        mirror: true,
      },
      {
        x: centerX + stemHeight * 0.16,
        y: stemBase - stemHeight * 0.53,
        scale: 0.5,
        rotation: 25,
        mirror: false,
      },
      {
        x: centerX - stemHeight * 0.14,
        y: stemBase - stemHeight * 0.68,
        scale: 0.45,
        rotation: -35,
        mirror: true,
      },
      {
        x: centerX + stemHeight * 0.12,
        y: stemBase - stemHeight * 0.8,
        scale: 0.42,
        rotation: 30,
        mirror: false,
      },
    ];
    for (let i = 0; i < Math.min(branchLeafCount, branchPositions.length); i++) {
      positions.push(branchPositions[i]);
    }
  }

  return (
    <>
      {positions.map((pos, i) => (
        <CannabisLeaf
          key={i}
          cx={pos.x}
          cy={pos.y}
          scale={pos.scale}
          rotation={pos.rotation}
          color={leafColor}
          mirror={pos.mirror}
        />
      ))}
    </>
  );
}

function Flower({
  cx,
  cy,
  size,
  variant = "purple",
}: {
  cx: number;
  cy: number;
  size: number;
  variant?: "purple" | "amber";
}) {
  const fill = variant === "purple" ? "url(#flower-fill)" : "url(#flower-amber)";
  const petalCount = 5;
  const petals = [];

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(angle) * size * 0.6;
    const py = cy + Math.sin(angle) * size * 0.6;
    petals.push(
      <ellipse
        key={i}
        cx={px}
        cy={py}
        rx={size * 0.42}
        ry={size * 0.28}
        transform={`rotate(${(angle * 180) / Math.PI + 90} ${px} ${py})`}
        fill={fill}
        opacity={0.85}
      />,
    );
  }

  return (
    <g style={{ transition: "opacity 600ms ease-in-out" }}>
      {petals}
      {/* Center pistil */}
      <circle cx={cx} cy={cy} r={size * 0.2} fill="#F4E7CA" opacity={0.9} />
      <circle cx={cx} cy={cy} r={size * 0.1} fill="#B8782F" opacity={0.7} />
    </g>
  );
}

function Pot({
  potTop,
  vw,
  vh,
}: {
  potTop: number;
  vw: number;
  vh: number;
}) {
  const rimY = potTop + 12;
  const bottomY = vh - 12;
  const rimWidth = 56;
  const bottomWidth = 42;
  const cx = vw / 2;

  return (
    <g>
      {/* Pot body — trapezoid with rounded bottom */}
      <path
        d={`
          M ${cx - rimWidth} ${rimY}
          L ${cx - bottomWidth} ${bottomY - 8}
          Q ${cx - bottomWidth} ${bottomY} ${cx - bottomWidth + 8} ${bottomY}
          L ${cx + bottomWidth - 8} ${bottomY}
          Q ${cx + bottomWidth} ${bottomY} ${cx + bottomWidth} ${bottomY - 8}
          L ${cx + rimWidth} ${rimY}
          Z
        `}
        fill="url(#pot-grad)"
      />
      {/* Pot rim */}
      <rect
        x={cx - rimWidth - 4}
        y={potTop + 4}
        width={(rimWidth + 4) * 2}
        height={10}
        rx={5}
        fill="url(#pot-rim)"
      />
      {/* Subtle highlight stripe on pot */}
      <rect
        x={cx - rimWidth + 8}
        y={rimY + 12}
        width={4}
        height={bottomY - rimY - 28}
        rx={2}
        fill="white"
        opacity={0.08}
      />
    </g>
  );
}
