// <Vitals.BP>, <Vitals.Temp>, <Vitals.SpO2> — clinical-unit primitives.
//
// Wraps the vitals helpers from src/lib/ui/format. Tabular numerals so
// vital-signs columns line up. The display string includes the unit so the
// component is safe to drop anywhere without extra context.

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { vitals as fmtVitals } from "@/lib/ui/format";

interface BaseProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {}

export interface BpProps extends BaseProps {
  systolic: number | null | undefined;
  diastolic: number | null | undefined;
  /** Suffix appended after the BP reading; defaults to no suffix. */
  suffix?: "mmHg" | "";
}

function BP({ systolic, diastolic, suffix = "", className, ...rest }: BpProps) {
  const value = fmtVitals.bp(systolic, diastolic);
  const display = suffix && value !== "—" ? `${value} ${suffix}` : value;
  return (
    <span
      data-component="vitals-bp"
      className={cn("tabular-nums", className)}
      {...rest}
    >
      {display}
    </span>
  );
}

export interface TempProps extends BaseProps {
  value: number | null | undefined;
  unit?: "F" | "C";
}

function Temp({ value, unit = "F", className, ...rest }: TempProps) {
  return (
    <span
      data-component="vitals-temp"
      className={cn("tabular-nums", className)}
      {...rest}
    >
      {fmtVitals.temp(value, unit)}
    </span>
  );
}

export interface SpO2Props extends BaseProps {
  value: number | null | undefined;
}

function SpO2({ value, className, ...rest }: SpO2Props) {
  return (
    <span
      data-component="vitals-spo2"
      className={cn("tabular-nums", className)}
      {...rest}
    >
      {fmtVitals.spo2(value)}
    </span>
  );
}

export const Vitals = { BP, Temp, SpO2 };
