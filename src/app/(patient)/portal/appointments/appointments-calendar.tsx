"use client";

import * as React from "react";
import { Calendar, type CalendarEvent } from "@/components/ui/calendar";

export function AppointmentsCalendar({ events }: { events: CalendarEvent[] }) {
  const [value, setValue] = React.useState<Date>(new Date());
  const [view, setView] = React.useState<"month" | "week" | "day">("month");

  return (
    <Calendar
      value={value}
      onChange={setValue}
      view={view}
      onViewChange={setView}
      events={events}
      // Patients don't create appointments by drag — they go through booking.
    />
  );
}
