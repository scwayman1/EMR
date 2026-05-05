// @ts-nocheck
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface VitalRecord {
  date: string; // ISO string
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  weightLbs?: number;
}

export interface VitalsTrendGraphProps {
  data: VitalRecord[];
  metric: "blood_pressure" | "heart_rate" | "weight";
}

/**
 * Renders a CSS-based sparkline trend graph for patient vitals.
 * In V1, we use a simple HTML/CSS bar graph approach to avoid heavy charting libraries.
 * In V2, this will be replaced with Recharts or Chart.js for full interactivity.
 */
export function VitalsTrendGraph({ data, metric }: VitalsTrendGraphProps) {
  // Sort data chronologically
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Calculate scales and max values
  const maxValue = useMemo(() => {
    if (sortedData.length === 0) return 0;
    if (metric === "blood_pressure") {
      return Math.max(...sortedData.map(d => d.systolic || 0), 140); // Baseline max 140
    }
    if (metric === "heart_rate") {
      return Math.max(...sortedData.map(d => d.heartRate || 0), 100);
    }
    return Math.max(...sortedData.map(d => d.weightLbs || 0), 200);
  }, [sortedData, metric]);

  const minValue = useMemo(() => {
    if (sortedData.length === 0) return 0;
    if (metric === "blood_pressure") {
      return Math.min(...sortedData.map(d => d.diastolic || 999).filter(v => v < 999), 60);
    }
    if (metric === "heart_rate") {
      return Math.min(...sortedData.map(d => d.heartRate || 999).filter(v => v < 999), 50);
    }
    const minWeight = Math.min(...sortedData.map(d => d.weightLbs || 9999).filter(v => v < 9999));
    return Math.max(0, minWeight - 20); // Give some bottom padding
  }, [sortedData, metric]);

  // If no data, return empty state
  if (sortedData.length === 0) {
    return (
      <Card tone="glass">
        <CardContent className="py-12 text-center">
          <p className="text-text-muted">No vitals recorded for this metric.</p>
        </CardContent>
      </Card>
    );
  }

  const range = maxValue - minValue;

  const title = metric === "blood_pressure" ? "Blood Pressure" : metric === "heart_rate" ? "Heart Rate" : "Weight";
  const unit = metric === "blood_pressure" ? "mmHg" : metric === "heart_rate" ? "bpm" : "lbs";

  return (
    <Card tone="raised" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="text-xs">{data.length} Records</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full flex items-end gap-2 pt-6 border-b border-[var(--border)] relative">
          
          {/* Y-Axis Labels */}
          <div className="absolute left-0 top-0 text-[10px] text-text-subtle">{maxValue} {unit}</div>
          <div className="absolute left-0 bottom-2 text-[10px] text-text-subtle">{minValue} {unit}</div>
          
          {/* Grid lines */}
          <div className="absolute left-10 right-0 top-3 h-px bg-[var(--border)] opacity-50" />
          <div className="absolute left-10 right-0 top-1/2 h-px bg-[var(--border)] opacity-50" />
          
          {/* Data Points */}
          <div className="flex-1 flex items-end justify-between pl-12 h-full pb-1">
            {sortedData.map((record, i) => {
              if (metric === "blood_pressure" && record.systolic && record.diastolic) {
                // Render a range bar for BP
                const topPercent = ((record.systolic - minValue) / range) * 100;
                const bottomPercent = ((record.diastolic - minValue) / range) * 100;
                const heightPercent = topPercent - bottomPercent;
                
                return (
                  <div key={i} className="group relative flex flex-col items-center w-full max-w-[24px]">
                    <div 
                      className="w-2 rounded-full bg-[var(--accent)]/30 group-hover:bg-[var(--accent)] transition-colors absolute bottom-0"
                      style={{ 
                        height: `${heightPercent}%`,
                        marginBottom: `${bottomPercent}%`
                      }}
                    />
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[var(--ink)] text-[var(--bg)] text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                      {record.systolic}/{record.diastolic}
                    </div>
                  </div>
                );
              } 
              
              // For HR and Weight, render a single point
              const val = metric === "heart_rate" ? record.heartRate : record.weightLbs;
              if (!val) return <div key={i} className="w-full max-w-[24px]" />;
              
              const heightPercent = ((val - minValue) / range) * 100;
              
              return (
                <div key={i} className="group relative flex flex-col items-center w-full max-w-[24px] h-full justify-end">
                  <div 
                    className="w-2 h-2 rounded-full bg-[var(--accent)] group-hover:scale-150 transition-transform z-0"
                    style={{ marginBottom: `${heightPercent}%` }}
                  />
                  {/* Subtle connecting line down to the axis */}
                  <div 
                    className="w-px bg-[var(--accent)]/10 absolute bottom-0 -z-10"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[var(--ink)] text-[var(--bg)] text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                    {val} {unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* X-Axis Labels (Dates) */}
        <div className="flex justify-between pl-12 pr-4 mt-3 text-[10px] text-text-subtle">
          <span>{new Date(sortedData[0].date).toLocaleDateString()}</span>
          <span>{new Date(sortedData[sortedData.length - 1].date).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
