"use client";

/**
 * Thin client effect that pushes the current patient chart to the
 * versioned per-user "recently viewed" store consumed by
 * `<RecentPatientsStrip />` and `<QuickJump />`.
 *
 * The patient chart `page.tsx` runs server-side — this drop-in tracker
 * lets the server hand us the resolved patient details and we record the
 * view on mount. The store itself dedupes views within 30s so a
 * re-render of the chart page doesn't churn the recents list.
 *
 * This is *additional* to the older `<TrackPatientView />` shell tracker
 * (which feeds the sidebar's name-only list). Both are no-cost effects.
 */

import * as React from "react";
import { recordPatientView } from "@/lib/patient/recent-patients-store";

export interface TrackChartViewProps {
  userId: string;
  patientId: string;
  patientName: string;
  avatarUrl?: string | null;
}

export function TrackChartView({
  userId,
  patientId,
  patientName,
  avatarUrl,
}: TrackChartViewProps) {
  React.useEffect(() => {
    recordPatientView(userId, patientId, patientName, avatarUrl ?? null);
  }, [userId, patientId, patientName, avatarUrl]);
  return null;
}
