/**
 * In-memory store for the Imaging Lab demo.
 *
 * This is process-local. It exists to keep the imaging track shippable
 * without a Prisma migration that would conflict with concurrent tracks.
 * The shape of every accessor mirrors what a real PACS-backed Prisma model
 * would expose, so swapping the store for the real one is mechanical.
 */

import {
  DEMO_ANNOTATIONS,
  DEMO_REPORTS,
  DEMO_STUDIES,
  type ImagingAnnotation,
  type ImagingStudy,
  type RadiologyReport,
} from "./medical-imaging";

interface ImagingState {
  studies: Map<string, ImagingStudy>;
  annotations: Map<string, ImagingAnnotation>;
  reports: Map<string, RadiologyReport>;
}

declare global {
  // eslint-disable-next-line no-var
  var __EMR_IMAGING_STORE__: ImagingState | undefined;
}

function init(): ImagingState {
  const state: ImagingState = {
    studies: new Map(),
    annotations: new Map(),
    reports: new Map(),
  };
  for (const s of DEMO_STUDIES) state.studies.set(s.id, structuredClone(s));
  for (const a of DEMO_ANNOTATIONS)
    state.annotations.set(a.id, structuredClone(a));
  for (const r of DEMO_REPORTS) state.reports.set(r.id, structuredClone(r));
  return state;
}

function getStore(): ImagingState {
  // Reuse across hot reloads in dev so demo edits stick across rebuilds.
  if (!globalThis.__EMR_IMAGING_STORE__) {
    globalThis.__EMR_IMAGING_STORE__ = init();
  }
  return globalThis.__EMR_IMAGING_STORE__;
}

// ─── Studies ──────────────────────────────────────────────────────────────

export function listStudies(patientId?: string): ImagingStudy[] {
  const store = getStore();
  const all = Array.from(store.studies.values());
  const filtered = patientId ? all.filter((s) => s.patientId === patientId) : all;
  return filtered.sort((a, b) => (a.studyDate < b.studyDate ? 1 : -1));
}

export function getStudy(id: string): ImagingStudy | null {
  return getStore().studies.get(id) ?? null;
}

export function upsertStudy(study: ImagingStudy): ImagingStudy {
  const store = getStore();
  store.studies.set(study.id, study);
  return study;
}

// ─── Annotations ──────────────────────────────────────────────────────────

export function listAnnotations(
  studyId: string,
  options?: { patientVisibleOnly?: boolean },
): ImagingAnnotation[] {
  const store = getStore();
  const all = Array.from(store.annotations.values()).filter(
    (a) => a.studyId === studyId,
  );
  if (options?.patientVisibleOnly) {
    return all.filter((a) => a.patientVisible && a.severity !== "critical");
  }
  return all;
}

export function saveAnnotation(annotation: ImagingAnnotation): ImagingAnnotation {
  getStore().annotations.set(annotation.id, annotation);
  return annotation;
}

export function deleteAnnotation(id: string): boolean {
  return getStore().annotations.delete(id);
}

// ─── Reports ──────────────────────────────────────────────────────────────

export function getReportForStudy(
  studyId: string,
  options?: { patientVisibleOnly?: boolean },
): RadiologyReport | null {
  const store = getStore();
  const report = Array.from(store.reports.values()).find(
    (r) => r.studyId === studyId,
  );
  if (!report) return null;
  if (options?.patientVisibleOnly && !report.releasedToPatient) return null;
  return report;
}

export function saveReport(report: RadiologyReport): RadiologyReport {
  getStore().reports.set(report.id, report);
  return report;
}
