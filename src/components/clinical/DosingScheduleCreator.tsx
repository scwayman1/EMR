// @ts-nocheck
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DoseWindow {
  id: string;
  timeOfDay: string; // "Morning", "Afternoon", "Evening", "Bedtime", or custom time "08:00"
  volumeAmount: number;
  volumeUnit: string;
  instructions: string;
}

export interface DosingScheduleCreatorProps {
  initialSchedule?: DoseWindow[];
  onSave: (schedule: DoseWindow[]) => Promise<void>;
  productName: string;
}

/**
 * Custom Dosing Schedule Creator
 * Allows clinicians to define complex multi-window dosing schedules (e.g., microdosing protocols).
 */
export function DosingScheduleCreator({ 
  initialSchedule = [], 
  onSave, 
  productName 
}: DosingScheduleCreatorProps) {
  const [schedule, setSchedule] = useState<DoseWindow[]>(
    initialSchedule.length > 0 ? initialSchedule : [
      { id: "1", timeOfDay: "Bedtime", volumeAmount: 1, volumeUnit: "mL", instructions: "Take 30 minutes before sleep." }
    ]
  );
  const [isSaving, setIsSaving] = useState(false);

  const addWindow = () => {
    setSchedule([
      ...schedule,
      {
        id: Math.random().toString(36).substr(2, 9),
        timeOfDay: "Morning",
        volumeAmount: 0.5,
        volumeUnit: "mL",
        instructions: "Take with food.",
      }
    ]);
  };

  const removeWindow = (id: string) => {
    setSchedule(schedule.filter(w => w.id !== id));
  };

  const updateWindow = (id: string, field: keyof DoseWindow, value: any) => {
    setSchedule(schedule.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(schedule);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card tone="raised" className="max-w-2xl">
      <CardHeader className="pb-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dosing Schedule</CardTitle>
            <p className="text-sm text-text-muted mt-1">Configure daily administration windows for {productName}.</p>
          </div>
          <Badge tone="accent">{schedule.length} Windows</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-6">
          {schedule.map((window, index) => (
            <div key={window.id} className="p-5 bg-[var(--surface-muted)]/50 rounded-2xl border border-[var(--border)] relative group">
              <button 
                onClick={() => removeWindow(window.id)}
                className="absolute -right-3 -top-3 w-8 h-8 bg-white border border-[var(--border)] rounded-full flex items-center justify-center text-text-muted hover:text-[var(--danger)] hover:border-[var(--danger)] shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove dose window"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <span className="font-medium text-sm text-text">Dose {index + 1}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Time of Day</label>
                  <select 
                    value={window.timeOfDay}
                    onChange={(e) => updateWindow(window.id, "timeOfDay", e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-lg text-sm focus:border-[var(--accent)] outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Bedtime">Bedtime</option>
                    <option value="As Needed">As Needed (PRN)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Amount</label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    value={window.volumeAmount}
                    onChange={(e) => updateWindow(window.id, "volumeAmount", parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-lg text-sm focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Unit</label>
                  <select 
                    value={window.volumeUnit}
                    onChange={(e) => updateWindow(window.id, "volumeUnit", e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-lg text-sm focus:border-[var(--accent)] outline-none"
                  >
                    <option value="mL">mL</option>
                    <option value="mg">mg</option>
                    <option value="drops">drops</option>
                    <option value="gummies">gummies</option>
                    <option value="inhales">inhales</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Patient Instructions</label>
                <input 
                  type="text"
                  value={window.instructions}
                  onChange={(e) => updateWindow(window.id, "instructions", e.target.value)}
                  placeholder="e.g., Take with food, place under tongue for 60 seconds..."
                  className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-lg text-sm focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>
          ))}

          <Button 
            variant="outline" 
            className="w-full border-dashed border-2 py-6 text-text-muted hover:text-[var(--accent)] hover:border-[var(--accent)] bg-transparent hover:bg-[var(--accent)]/5"
            onClick={addWindow}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Dose Window
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-end gap-3">
          <Button variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || schedule.length === 0}>
            {isSaving ? "Saving Protocol..." : "Save Dosing Protocol"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
