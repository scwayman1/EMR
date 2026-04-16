"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "lj-recent-patients";
const MAX_RECENTS = 5;

export interface RecentPatient {
  id: string;
  name: string;
  viewedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Storage helpers — exported for use by trackers (e.g. patient page) */
/* ------------------------------------------------------------------ */

function safeRead(): RecentPatient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is RecentPatient =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.viewedAt === "number",
    );
  } catch {
    return [];
  }
}

function safeWrite(items: RecentPatient[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Notify other tabs / sibling components in this tab.
    window.dispatchEvent(new CustomEvent("lj-recent-patients-updated"));
  } catch {
    /* quota / private mode — silently skip */
  }
}

/**
 * Add (or refresh) a patient to the front of the recents list.
 * Safe to call from useEffect on mount.
 */
export function addRecentPatient(id: string, name: string) {
  if (!id || !name) return;
  const current = safeRead();
  const filtered = current.filter((p) => p.id !== id);
  const next: RecentPatient[] = [
    { id, name, viewedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENTS);
  safeWrite(next);
}

/* ------------------------------------------------------------------ */
/*  <RecentPatients /> — sidebar strip                                 */
/* ------------------------------------------------------------------ */

export function RecentPatients({ className }: { className?: string }) {
  const [items, setItems] = useState<RecentPatient[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(safeRead());
    setHydrated(true);

    const refresh = () => setItems(safeRead());
    // Update when this tab adds a patient.
    window.addEventListener("lj-recent-patients-updated", refresh);
    // Update when another tab edits storage.
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) refresh();
    });
    return () => {
      window.removeEventListener("lj-recent-patients-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Avoid hydration mismatch — render nothing on the server pass.
  if (!hydrated) return null;
  if (items.length === 0) return null;

  return (
    <Card tone="default" className={cn("p-4", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
        Recently viewed
      </p>
      <ul className="space-y-1">
        {items.map((p) => {
          const [first, ...rest] = p.name.split(" ");
          const last = rest.join(" ") || "";
          return (
            <li key={p.id}>
              <Link
                href={`/clinic/patients/${p.id}`}
                className="flex items-center gap-2.5 px-2 py-1.5 -mx-2 rounded-lg hover:bg-surface-muted/50 transition-colors group"
              >
                <Avatar firstName={first ?? ""} lastName={last} size="sm" />
                <span className="text-sm text-text truncate group-hover:text-accent transition-colors flex-1">
                  {p.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  <TrackPatientView /> — drop-in tracker for the patient chart page  */
/* ------------------------------------------------------------------ */

export function TrackPatientView({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  useEffect(() => {
    addRecentPatient(patientId, patientName);
  }, [patientId, patientName]);

  return null;
}
