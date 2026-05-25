"use client";

/**
 * Week mini-calendar of upcoming telehealth visits.
 * Adopts the shared <CalendarWeek> primitive — no drag-create needed here.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarWeek, type CalendarEvent } from "@/components/ui/calendar";

export function VisitWeekCalendar({ events }: { events: CalendarEvent[] }) {
  const router = useRouter();
  const [value] = React.useState<Date>(new Date());
  return (
    <CalendarWeek
      value={value}
      events={events}
      onEventClick={(ev) => {
        if (ev.href) router.push(ev.href);
      }}
      startHour={7}
      endHour={20}
    />
  );
}
