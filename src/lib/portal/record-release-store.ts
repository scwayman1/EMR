"use client";

/**
 * Client-side persistence for EMR-082 record-release scaffolds.
 *
 * Stored in sessionStorage so the user can submit a request, see it in the
 * "My releases" list, and have it survive a page refresh — without forcing
 * a Prisma migration during the scaffold phase. When the real storage
 * layer lands, swap these three functions for server actions and the
 * UI keeps working unchanged.
 */

import type { RecordReleaseRequest } from "@/lib/domain/record-release";

const STORAGE_KEY = "leafjourney:record-release-requests:v1";

function read(): RecordReleaseRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecordReleaseRequest[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecordReleaseRequest[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / disabled
  }
}

export function listRequests(): RecordReleaseRequest[] {
  return read().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveRequest(req: RecordReleaseRequest): void {
  const next = read().filter((r) => r.id !== req.id);
  next.unshift(req);
  write(next);
}

export function revokeRequest(id: string): void {
  const next = read().map((r) =>
    r.id === id
      ? { ...r, status: "revoked" as const, updatedAt: new Date().toISOString() }
      : r,
  );
  write(next);
}
