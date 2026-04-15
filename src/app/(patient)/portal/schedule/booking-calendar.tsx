"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateSlots,
  DEFAULT_AVAILABILITY,
  APPOINTMENT_TYPE_LABELS,
  type AppointmentType,
  type TimeSlot,
} from "@/lib/domain/scheduling";

// ── Types ──────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  name: string;
  title: string;
}

interface BookingCalendarProps {
  providers: ProviderInfo[];
  patientId: string;
}

type BookingStep = "selecting" | "confirming" | "booked";

// ── Helpers ────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

// ── Component ──────────────────────────────────────────

export function BookingCalendar({ providers, patientId }: BookingCalendarProps) {
  const [selectedProviderId, setSelectedProviderId] = useState(
    providers[0]?.id ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>("follow_up");
  const [step, setStep] = useState<BookingStep>("selecting");
  const [submitting, setSubmitting] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{
    date: string;
    time: string;
    provider: string;
    type: string;
  } | null>(null);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const providerDisplayName = selectedProvider
    ? `${selectedProvider.title} ${selectedProvider.name}`
    : "";

  // 14 days from today
  const dateRange = useMemo(() => generateDateRange(14), []);

  // Generate slots for selected date
  const slots = useMemo(() => {
    if (!selectedDate || !selectedProviderId) return [];
    return generateSlots(
      selectedDate,
      selectedProviderId,
      providerDisplayName,
      DEFAULT_AVAILABILITY
    );
  }, [selectedDate, selectedProviderId, providerDisplayName]);

  const availableSlots = slots.filter((s) => s.status === "available");

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("selecting");
  }, []);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("confirming");
  }, []);

  const handleBook = useCallback(async () => {
    if (!selectedSlot || !selectedDate) return;
    setSubmitting(true);
    try {
      // Simulate booking delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      setBookedDetails({
        date: formatDateLabel(selectedDate),
        time: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
        provider: providerDisplayName,
        type: APPOINTMENT_TYPE_LABELS[appointmentType].label,
      });
      setStep("booked");
    } finally {
      setSubmitting(false);
    }
  }, [selectedSlot, selectedDate, appointmentType, providerDisplayName]);

  // ── Success state ─────────────────────────────────

  if (step === "booked" && bookedDetails) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card tone="raised" className="max-w-lg w-full rounded-2xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 mx-auto mb-6 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="text-accent"
              >
                <path
                  d="M11 16l3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-text mb-2">
              Appointment booked!
            </h2>
            <p className="text-text-muted mb-8">
              You will receive a confirmation email shortly.
            </p>

            <Card tone="default" className="text-left mx-auto max-w-sm rounded-2xl">
              <CardContent className="py-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Date</span>
                    <span className="text-text font-medium">
                      {bookedDetails.date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Time</span>
                    <span className="text-text font-medium">
                      {bookedDetails.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Provider</span>
                    <span className="text-text font-medium">
                      {bookedDetails.provider}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Type</span>
                    <Badge tone="accent">{bookedDetails.type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("selecting");
                  setSelectedSlot(null);
                  setSelectedDate(null);
                  setBookedDetails(null);
                }}
              >
                Schedule another appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main booking UI ───────────────────────────────

  return (
    <div className="space-y-8">
      {/* Provider selector */}
      <section>
        <p className="text-sm font-medium text-text mb-3">Choose a provider</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProviderId(p.id);
                setSelectedSlot(null);
                setStep("selecting");
              }}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all duration-200",
                selectedProviderId === p.id
                  ? "bg-accent/10 border-accent shadow-sm"
                  : "bg-surface border-border hover:bg-surface-muted hover:border-border-strong"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-display text-accent">
                    {p.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {p.title} {p.name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Date picker: horizontal scroll of 14 days */}
      <section>
        <p className="text-sm font-medium text-text mb-3">
          Select a date (next 14 days)
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {dateRange.map((date) => {
            const weekend = isWeekend(date);
            const today = isToday(date);
            const d = new Date(date + "T12:00:00");
            return (
              <button
                key={date}
                onClick={() => !weekend && handleDateSelect(date)}
                disabled={weekend}
                className={cn(
                  "shrink-0 w-[72px] rounded-2xl border p-3 text-center transition-all duration-200",
                  weekend && "opacity-35 cursor-not-allowed",
                  selectedDate === date
                    ? "bg-accent/10 border-accent shadow-sm"
                    : !weekend
                      ? "bg-surface border-border hover:bg-surface-muted hover:border-border-strong"
                      : "bg-surface border-border",
                  today && selectedDate !== date && "border-accent/40"
                )}
              >
                <p className="text-[10px] uppercase tracking-wider text-text-subtle">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p
                  className={cn(
                    "text-lg font-display mt-0.5",
                    selectedDate === date ? "text-accent" : "text-text"
                  )}
                >
                  {d.getDate()}
                </p>
                <p className="text-[10px] text-text-subtle">
                  {d.toLocaleDateString("en-US", { month: "short" })}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Appointment type pills */}
      <section>
        <p className="text-sm font-medium text-text mb-3">Appointment type</p>
        <div className="flex flex-wrap gap-2">
          {(["follow_up", "telehealth", "new_patient"] as AppointmentType[]).map(
            (t) => {
              const info = APPOINTMENT_TYPE_LABELS[t];
              return (
                <button
                  key={t}
                  onClick={() => setAppointmentType(t)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-all duration-200",
                    appointmentType === t
                      ? "bg-accent/10 border-accent text-accent font-medium"
                      : "bg-surface border-border text-text-muted hover:bg-surface-muted"
                  )}
                >
                  {info.label}{" "}
                  <span className="text-xs text-text-subtle">
                    ({info.duration} min)
                  </span>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* Time slot grid + Confirmation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time slots (3 columns) */}
        <div className="lg:col-span-2">
          {selectedDate ? (
            <>
              <p className="text-sm font-medium text-text mb-3">
                Available times for {formatDateLabel(selectedDate)}
              </p>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-mono tabular-nums transition-all duration-200",
                        selectedSlot?.id === slot.id
                          ? "bg-accent text-white border-accent shadow-md"
                          : "bg-surface border-border text-text hover:bg-surface-muted hover:border-accent/40"
                      )}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              ) : (
                <Card tone="default" className="rounded-2xl">
                  <CardContent className="py-8 text-center text-text-muted text-sm">
                    No available slots for this date. Try another day.
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card tone="default" className="rounded-2xl">
              <CardContent className="py-12 text-center text-text-muted text-sm">
                Select a date above to see available time slots.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Confirmation card */}
        <div>
          {step === "confirming" && selectedSlot && selectedDate ? (
            <Card tone="raised" className="sticky top-6 rounded-2xl">
              <CardHeader>
                <CardTitle>Confirm booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Provider
                    </p>
                    <p className="text-text font-medium">
                      {providerDisplayName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Date
                    </p>
                    <p className="text-text font-medium">
                      {formatDateLabel(selectedDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Time
                    </p>
                    <p className="text-text font-medium font-mono tabular-nums">
                      {selectedSlot.startTime} - {selectedSlot.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Type
                    </p>
                    <Badge tone="accent" className="mt-1">
                      {APPOINTMENT_TYPE_LABELS[appointmentType].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Modality
                    </p>
                    <p className="text-text">
                      {appointmentType === "telehealth" ? "Video" : "In-person"}
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Button
                  onClick={handleBook}
                  disabled={submitting}
                  size="lg"
                  className="w-full"
                >
                  {submitting ? "Booking..." : "Book appointment"}
                </Button>
                <p className="text-[11px] text-text-subtle text-center mt-2">
                  Your appointment will be pending confirmation.
                </p>
              </div>
            </Card>
          ) : (
            <Card tone="default" className="sticky top-6 rounded-2xl">
              <CardContent className="py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-accent/10 mx-auto mb-4 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-accent/50"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <p className="text-sm text-text-muted">
                  Select a date and time to see booking details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
