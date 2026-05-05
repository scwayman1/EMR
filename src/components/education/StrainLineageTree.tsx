// @ts-nocheck
"use client";

import { Leaf, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export interface StrainNode {
  id: string;
  name: string;
  type: "indica" | "sativa" | "hybrid" | "ruderalis";
  thcRange?: string;
  parents?: StrainNode[];
}

export interface StrainLineageTreeProps {
  rootStrain: StrainNode;
  className?: string;
}

const TYPE_COLORS = {
  indica: "bg-indigo-100 text-indigo-800 border-indigo-200",
  sativa: "bg-amber-100 text-amber-800 border-amber-200",
  hybrid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ruderalis: "bg-slate-100 text-slate-800 border-slate-200",
};

/**
 * A recursive component to render a botanical lineage tree (pedigree chart).
 * V1 uses simple HTML/CSS flexbox to structure the tree from left (ancestors) to right (descendants).
 */
export function StrainLineageTree({ rootStrain, className }: StrainLineageTreeProps) {
  
  // Recursive node renderer
  const renderNode = (node: StrainNode, isRoot: boolean = false) => {
    return (
      <div className="flex items-center">
        {/* Render parents recursively if they exist */}
        {node.parents && node.parents.length > 0 && (
          <div className="flex flex-col gap-4 pr-6 relative">
            {/* The vertical connecting line for siblings */}
            <div className="absolute right-6 top-1/4 bottom-1/4 w-px bg-[var(--border)]" />
            
            {node.parents.map((parent, idx) => (
              <div key={parent.id} className="relative">
                {/* Horizontal connector to the vertical line */}
                <div className="absolute -right-6 top-1/2 w-6 h-px bg-[var(--border)]" />
                {renderNode(parent, false)}
              </div>
            ))}
          </div>
        )}

        {/* Render the current node */}
        <div className="relative">
          {/* Connector to the child (if not the root node) */}
          {!isRoot && (
            <div className="absolute -right-6 top-1/2 w-6 h-px bg-[var(--border)]" />
          )}

          <div 
            className={cn(
              "p-4 rounded-2xl border-2 shadow-sm min-w-[160px] bg-white transition-all hover:scale-105",
              isRoot ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/10" : "border-[var(--border)] hover:border-[var(--accent)]"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Leaf className={cn("w-4 h-4", isRoot ? "text-[var(--accent)]" : "text-text-muted")} />
              <span className="font-semibold text-text text-sm">{node.name}</span>
            </div>
            
            <div className="flex flex-col gap-1.5 mt-2">
              <Badge variant="outline" className={cn("text-[10px] w-fit", TYPE_COLORS[node.type])}>
                {node.type.toUpperCase()}
              </Badge>
              {node.thcRange && (
                <span className="text-[10px] text-text-muted font-medium">
                  THC: {node.thcRange}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full overflow-x-auto p-8 rounded-3xl bg-[var(--surface-muted)]/30 border border-[var(--border)]", className)}>
      <div className="flex items-center justify-between mb-8 sticky left-0">
        <div>
          <h3 className="font-display text-2xl text-text tracking-tight mb-1">Genetic Lineage</h3>
          <p className="text-sm text-text-muted">Trace the botanical ancestry of {rootStrain.name}.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-text-subtle bg-white px-3 py-1.5 rounded-full shadow-sm border border-[var(--border)]">
          <Info className="w-3.5 h-3.5" /> Drag to explore
        </div>
      </div>
      
      <div className="min-w-max flex justify-start pl-4 py-4">
        {/* We reverse the tree visually by using flex-row-reverse so the root is on the right, ancestors on the left */}
        <div className="flex flex-row-reverse items-center">
          {renderNode(rootStrain, true)}
        </div>
      </div>
    </div>
  );
}
