"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { rescheduleAppointmentAction } from "./actions";

export type AppointmentDTO = {
  id: string;
  patientId: string;
  patientName: string;
  providerName: string | null;
  startAtIso: string;
  endAtIso: string;
  status: string;
  modality: string;
  notes: string | null;
};

type View = "day" | "week" | "list";

type Props = {
  weekStartIso: string;
  appointments: AppointmentDTO[];
  initialView?: View;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const FIRST_HOUR = 7;
const LAST_HOUR = 19;
const SLOT_MIN = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (LAST_HOUR - FIRST_HOUR) * SLOTS_PER_HOUR;
const SQUARE = 36; // px per slot — keeps cells visually square

export function ScheduleCalendar({ weekStartIso, appointments, initialView = "week" }: Props) {
  const router = useRouter();
  const [view, setView] = React.useState<View>(initialView);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const weekStart = React.useMemo(() => new Date(weekStartIso), [weekStartIso]);
  const dayStart = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= weekStart && today < addDays(weekStart, 7)) return today;
    return weekStart;
  }, [weekStart]);

  const onDrop = async (appointmentId: string, dayIdx: number, slotIdx: number) => {
    setError(null);
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + dayIdx);
    newStart.setMinutes(FIRST_HOUR * 60 + slotIdx * SLOT_MIN);
    setPending(true);
    try {
      const r = await rescheduleAppointmentAction({
        appointmentId,
        newStartIso: newStart.toISOString(),
      });
      if (!r.ok) setError(r.error);
      else router.refresh();
    } finally {
      setPending(false);
    }
  };

  const goWeek = (delta: number) => {
    const next = addDays(weekStart, delta * 7);
    const iso = next.toISOString().slice(0, 10);
    router.push(`/clinic/schedule?week=${iso}&view=${view}`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          {(["day", "week", "list"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md capitalize transition-colors",
                view === v ? "bg-accent text-accent-ink" : "text-text-muted hover:text-text",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => goWeek(-1)}>
            ← Prev
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/clinic/schedule")}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => goWeek(1)}>
            Next →
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {view === "list" && <ListView appointments={appointments} />}
      {view === "week" && (
        <WeekGrid
          weekStart={weekStart}
          appointments={appointments}
          onDrop={onDrop}
          pending={pending}
        />
      )}
      {view === "day" && (
        <DayGrid
          day={dayStart}
          appointments={appointments.filter((a) =>
            sameDay(new Date(a.startAtIso), dayStart),
          )}
          onDrop={(apptId, slotIdx) => {
            const dayIdx = Math.round(
              (dayStart.getTime() - weekStart.getTime()) / 86_400_000,
            );
            return onDrop(apptId, dayIdx, slotIdx);
          }}
          pending={pending}
        />
      )}
    </div>
  );
}

// ── Week grid ───────────────────────────────────────────────────

function WeekGrid({
  weekStart,
  appointments,
  onDrop,
  pending,
}: {
  weekStart: Date;
  appointments: AppointmentDTO[];
  onDrop: (apptId: string, dayIdx: number, slotIdx: number) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 overflow-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: `60px repeat(7, minmax(120px, 1fr))` }}
        >
          {/* Header row */}
          <div className="h-8" />
          {DAYS.map((d, idx) => {
            const date = addDays(weekStart, idx);
            const isToday = sameDay(date, new Date());
            return (
              <div
                key={d}
                className={cn(
                  "h-8 flex items-center justify-center text-[11px] uppercase tracking-wider border-b border-border",
                  isToday ? "text-accent font-semibold" : "text-text-subtle",
                )}
              >
                {d} {date.getDate()}
              </div>
            );
          })}

          {/* Time + slot rows */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
            const hour = FIRST_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR);
            const min = (slotIdx % SLOTS_PER_HOUR) * SLOT_MIN;
            const isHourMark = min === 0;
            return (
              <React.Fragment key={slotIdx}>
                <div
                  className={cn(
                    "text-[10px] tabular-nums text-text-subtle pr-2 text-right",
                    isHourMark ? "border-t border-border/60" : "",
                  )}
                  style={{ height: SQUARE }}
                >
                  {isHourMark ? `${hour}:00` : ""}
                </div>
                {DAYS.map((_, dayIdx) => (
                  <Slot
                    key={`${dayIdx}:${slotIdx}`}
                    dayIdx={dayIdx}
                    slotIdx={slotIdx}
                    appointment={findAppt(appointments, weekStart, dayIdx, slotIdx)}
                    onDrop={(apptId) => onDrop(apptId, dayIdx, slotIdx)}
                    pending={pending}
                    hourMark={isHourMark}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Slot({
  dayIdx,
  slotIdx,
  appointment,
  onDrop,
  pending,
  hourMark,
}: {
  dayIdx: number;
  slotIdx: number;
  appointment: AppointmentDTO | null;
  onDrop: (apptId: string) => void;
  pending: boolean;
  hourMark: boolean;
}) {
  const [isOver, setIsOver] = React.useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const apptId = e.dataTransfer.getData("text/appt-id");
        if (apptId) onDrop(apptId);
      }}
      className={cn(
        "border-r border-border/40",
        hourMark && "border-t border-border/60",
        isOver && "bg-accent-soft/50",
        pending && "opacity-70",
      )}
      style={{ height: SQUARE }}
    >
      {appointment && <AppointmentChip appt={appointment} />}
    </div>
  );
}

// ── Day grid ────────────────────────────────────────────────────

function DayGrid({
  day,
  appointments,
  onDrop,
  pending,
}: {
  day: Date;
  appointments: AppointmentDTO[];
  onDrop: (apptId: string, slotIdx: number) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-[11px] uppercase tracking-wider text-text-subtle font-medium mb-3">
          {day.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="grid" style={{ gridTemplateColumns: `60px 1fr` }}>
          {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
            const hour = FIRST_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR);
            const min = (slotIdx % SLOTS_PER_HOUR) * SLOT_MIN;
            const isHourMark = min === 0;
            const slotStart = new Date(day);
            slotStart.setHours(hour, min, 0, 0);
            const inSlot = appointments.find(
              (a) =>
                new Date(a.startAtIso).getTime() === slotStart.getTime(),
            );
            return (
              <React.Fragment key={slotIdx}>
                <div
                  className="text-[10px] tabular-nums text-text-subtle pr-2 text-right"
                  style={{ height: SQUARE }}
                >
                  {isHourMark ? `${hour}:00` : ""}
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const apptId = e.dataTransfer.getData("text/appt-id");
                    if (apptId) onDrop(apptId, slotIdx);
                  }}
                  className={cn(
                    "border-l border-border/40",
                    isHourMark && "border-t border-border/60",
                    pending && "opacity-70",
                  )}
                  style={{ height: SQUARE }}
                >
                  {inSlot && <AppointmentChip appt={inSlot} />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── List view ───────────────────────────────────────────────────

function ListView({ appointments }: { appointments: AppointmentDTO[] }) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6 text-center text-text-muted">
          No appointments scheduled this week.
        </CardContent>
      </Card>
    );
  }
  // Group by day for legibility.
  const groups = new Map<string, AppointmentDTO[]>();
  for (const a of appointments) {
    const key = new Date(a.startAtIso).toDateString();
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }
  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([dayKey, list]) => (
        <Card key={dayKey}>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle font-medium mb-3">
              {dayKey}
            </p>
            <ul className="divide-y divide-border/60">
              {list.map((a) => (
                <li key={a.id} className="py-2 flex items-center gap-3">
                  <span className="text-xs font-mono tabular-nums text-text-subtle w-16 shrink-0">
                    {formatTime(a.startAtIso)}
                  </span>
                  <Link
                    href={`/clinic/patients/${a.patientId}`}
                    className="flex-1 min-w-0 text-sm text-text hover:text-accent truncate"
                  >
                    {a.patientName}
                  </Link>
                  <Badge tone={statusTone(a.status)} className="text-[10px]">
                    {a.status}
                  </Badge>
                  <span className="text-[11px] text-text-subtle">{a.modality}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Chip + helpers ──────────────────────────────────────────────

function AppointmentChip({ appt }: { appt: AppointmentDTO }) {
  const start = new Date(appt.startAtIso);
  const end = new Date(appt.endAtIso);
  const slotCount = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (SLOT_MIN * 60_000)),
  );
  return (
    <Link
      href={`/clinic/patients/${appt.patientId}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/appt-id", appt.id)}
      className={cn(
        "block rounded-md px-2 py-1 mx-0.5 my-0.5 text-[11px] truncate cursor-grab active:cursor-grabbing",
        "bg-accent-soft border border-accent/30 text-accent hover:bg-accent/15 transition-colors",
      )}
      style={{ height: slotCount * SQUARE - 4 }}
      title={`${appt.patientName} · ${formatTime(appt.startAtIso)}–${formatTime(appt.endAtIso)} · ${appt.status}`}
    >
      <span className="font-medium truncate">{appt.patientName}</span>
    </Link>
  );
}

function findAppt(
  list: AppointmentDTO[],
  weekStart: Date,
  dayIdx: number,
  slotIdx: number,
): AppointmentDTO | null {
  const slotStart = new Date(weekStart);
  slotStart.setDate(slotStart.getDate() + dayIdx);
  slotStart.setHours(FIRST_HOUR, slotIdx * SLOT_MIN, 0, 0);
  return (
    list.find((a) => new Date(a.startAtIso).getTime() === slotStart.getTime()) ??
    null
  );
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(
  status: string,
): "success" | "warning" | "danger" | "info" | "neutral" | "accent" {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
    case "no_show":
      return "danger";
    case "confirmed":
      return "accent";
    case "scheduled":
      return "info";
    default:
      return "neutral";
  }
}
