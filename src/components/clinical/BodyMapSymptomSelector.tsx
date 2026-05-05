"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface BodyRegion {
  id: string;
  label: string;
  coordinates: { x: number; y: number; width: number; height: number };
}

// Simplified generic regions for V1 demonstration
const REGIONS: BodyRegion[] = [
  { id: "head", label: "Head & Neck", coordinates: { x: 40, y: 5, width: 20, height: 15 } },
  { id: "chest", label: "Chest", coordinates: { x: 35, y: 22, width: 30, height: 15 } },
  { id: "abdomen", label: "Abdomen", coordinates: { x: 35, y: 39, width: 30, height: 15 } },
  { id: "left_arm", label: "Left Arm", coordinates: { x: 67, y: 22, width: 15, height: 35 } },
  { id: "right_arm", label: "Right Arm", coordinates: { x: 18, y: 22, width: 15, height: 35 } },
  { id: "pelvis", label: "Pelvis & Hips", coordinates: { x: 35, y: 56, width: 30, height: 12 } },
  { id: "left_leg", label: "Left Leg", coordinates: { x: 52, y: 70, width: 15, height: 25 } },
  { id: "right_leg", label: "Right Leg", coordinates: { x: 33, y: 70, width: 15, height: 25 } },
];

export interface BodyMapSymptomSelectorProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
  className?: string;
}

export function BodyMapSymptomSelector({
  selectedRegions,
  onChange,
  className
}: BodyMapSymptomSelectorProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const toggleRegion = (id: string) => {
    if (selectedRegions.includes(id)) {
      onChange(selectedRegions.filter(r => r !== id));
    } else {
      onChange([...selectedRegions, id]);
    }
  };

  return (
    <div className={cn("relative w-full max-w-[300px] aspect-[1/2] mx-auto", className)}>
      {/* 
        V1: Abstract Humanoid Silhouette 
        In V2, this is replaced by an SVG with precise path boundaries.
      */}
      <div className="absolute inset-0 bg-[var(--surface-muted)] rounded-[40px] opacity-30 border-2 border-[var(--border)]" />
      
      {REGIONS.map((region) => {
        const isSelected = selectedRegions.includes(region.id);
        const isHovered = hoveredRegion === region.id;
        
        return (
          <button
            key={region.id}
            type="button"
            onMouseEnter={() => setHoveredRegion(region.id)}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => toggleRegion(region.id)}
            className={cn(
              "absolute rounded-full transition-all duration-200 ease-out border-2",
              isSelected 
                ? "bg-[var(--danger)]/20 border-[var(--danger)]/50 z-10" 
                : isHovered
                  ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 z-10"
                  : "bg-transparent border-transparent z-0"
            )}
            style={{
              left: `${region.coordinates.x}%`,
              top: `${region.coordinates.y}%`,
              width: `${region.coordinates.width}%`,
              height: `${region.coordinates.height}%`,
            }}
            aria-pressed={isSelected}
            aria-label={`Select ${region.label}`}
          >
            {/* Tooltip on hover */}
            {(isHovered || isSelected) && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--bg)] text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                {region.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
