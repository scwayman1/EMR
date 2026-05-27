"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  birthdayMonthDay,
  isBirthdayToday,
  msUntilNextDayPlusOneMinute,
} from "@/lib/utils/birthday";

/**
 * EMR-780 — Small 🎂 indicator rendered next to the patient's name when
 * today is their birthday. Client component so the visibility re-evaluates
 * across the local midnight boundary without a page reload.
 *
 * SSR-safe: the server renders nothing (the dob check runs on first
 * client effect) so we don't risk a hydration mismatch from clocks that
 * drift between server and client.
 */
export function BirthdayBadge({
  dateOfBirth,
  className,
  emoji = "🎂",
  ariaLabel = "Birthday today",
}: {
  dateOfBirth: Date | string | null | undefined;
  className?: string;
  emoji?: string;
  ariaLabel?: string;
}) {
  const md = React.useMemo(() => birthdayMonthDay(dateOfBirth), [dateOfBirth]);
  const [isBirthday, setIsBirthday] = React.useState(false);

  React.useEffect(() => {
    if (!md) {
      setIsBirthday(false);
      return;
    }
    const evaluate = () => setIsBirthday(isBirthdayToday(dateOfBirth));
    evaluate();
    const timer = window.setTimeout(() => {
      evaluate();
    }, msUntilNextDayPlusOneMinute());
    return () => window.clearTimeout(timer);
  }, [dateOfBirth, md]);

  if (!isBirthday) return null;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center align-middle",
        "text-xl leading-none",
        "animate-[birthday-bounce_1.6s_ease-in-out_infinite]",
        className,
      )}
    >
      {emoji}
    </span>
  );
}
