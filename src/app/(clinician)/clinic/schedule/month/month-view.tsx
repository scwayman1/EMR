"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, type CalendarEvent } from "@/components/ui/calendar";

type Props = {
  initialDateIso: string;
  events: CalendarEvent[];
};

export function MonthView({ initialDateIso, events }: Props) {
  const router = useRouter();
  const [value, setValue] = React.useState<Date>(new Date(initialDateIso));
  const [view, setView] = React.useState<"month" | "week" | "day">("month");

  function onChange(d: Date) {
    setValue(d);
    // Sync deep-link so back/forward & sharing work.
    const iso = d.toISOString().slice(0, 10);
    router.replace(`/clinic/schedule/month?month=${iso}`, { scroll: false });
  }

  function onCreate(start: Date) {
    // Hand off to the existing week-grid scheduler.
    const iso = start.toISOString().slice(0, 10);
    router.push(`/clinic/schedule?week=${iso}&view=day`);
  }

  return (
    <Calendar
      value={value}
      onChange={onChange}
      view={view}
      onViewChange={setView}
      events={events}
      onCreate={onCreate}
    />
  );
}
