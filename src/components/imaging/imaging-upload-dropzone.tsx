"use client";

/**
 * Imaging Upload Dropzone — EMR-166 (UI for the upload backend)
 *
 * Drag-and-drop or pick files. Posts multipart/form-data to
 * /api/imaging/upload along with the study metadata. Surfaces server-side
 * accept/reject decisions so providers see exactly which files made it in.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  ACCEPTED_IMAGING_MIME,
  MAX_UPLOAD_BYTES,
  MODALITY_LABEL,
  type ImagingStudy,
  type Modality,
  type UploadResult,
} from "@/lib/domain/medical-imaging";

interface Props {
  patientId: string;
  onUploaded?: (study: ImagingStudy, result: UploadResult) => void;
  className?: string;
}

const MODALITIES: Modality[] = ["CT", "MR", "XR", "US", "PT", "MG", "NM"];

export function ImagingUploadDropzone({ patientId, onUploaded, className }: Props) {
  const [modality, setModality] = React.useState<Modality>("CT");
  const [description, setDescription] = React.useState("");
  const [bodyPart, setBodyPart] = React.useState("");
  const [studyDate, setStudyDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [indication, setIndication] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    ok: boolean;
    message: string;
    rejected?: UploadResult["rejectedFiles"];
    studyId?: string;
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function addFiles(incoming: FileList | File[]) {
    const next: File[] = [];
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_UPLOAD_BYTES) continue; // server will reject too, but skip early
      next.push(f);
    }
    setFiles((prev) => [...prev, ...next]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);

    const fd = new FormData();
    fd.set("patientId", patientId);
    fd.set("modality", modality);
    fd.set("description", description);
    fd.set("bodyPart", bodyPart);
    fd.set("studyDate", studyDate);
    if (indication) fd.set("indication", indication);
    for (const f of files) fd.append("files", f);

    try {
      const res = await fetch("/api/imaging/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as
        | {
            ok: true;
            study: ImagingStudy;
            result: UploadResult;
          }
        | { error: string; rejected?: UploadResult["rejectedFiles"]; issues?: unknown };

      if (!res.ok || !("ok" in json)) {
        setResult({
          ok: false,
          message:
            ("error" in json && json.error) || `Upload failed (HTTP ${res.status})`,
          rejected: ("rejected" in json && json.rejected) || undefined,
        });
        return;
      }

      setResult({
        ok: true,
        message: `Uploaded ${json.result.acceptedFiles} file(s) into study ${json.study.id}`,
        rejected: json.result.rejectedFiles,
        studyId: json.study.id,
      });
      setFiles([]);
      setDescription("");
      setBodyPart("");
      setIndication("");
      onUploaded?.(json.study, json.result);
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Unknown upload error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    files.length > 0 &&
    description.trim().length > 0 &&
    bodyPart.trim().length > 0 &&
    !submitting;

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 space-y-4",
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Modality">
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as Modality)}
            className="h-9 rounded-md border border-border bg-surface-raised px-2 text-sm w-full"
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {m} — {MODALITY_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Study date">
          <input
            type="date"
            value={studyDate}
            onChange={(e) => setStudyDate(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-raised px-2 text-sm w-full"
          />
        </Field>
        <Field label="Description" required>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. CT Chest w/o contrast"
            className="h-9 rounded-md border border-border bg-surface-raised px-2 text-sm w-full"
          />
        </Field>
        <Field label="Body part" required>
          <input
            type="text"
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            placeholder="e.g. Chest"
            className="h-9 rounded-md border border-border bg-surface-raised px-2 text-sm w-full"
          />
        </Field>
      </div>

      <Field label="Clinical indication">
        <textarea
          value={indication}
          onChange={(e) => setIndication(e.target.value)}
          placeholder="Reason for the study, history, prior imaging…"
          className="min-h-[68px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm w-full"
        />
      </Field>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-accent bg-accent-soft/40"
            : "border-border hover:bg-surface-muted",
        )}
      >
        <p className="text-sm font-medium text-text">
          Drop DICOM, JPEG, PNG, or TIFF files here
        </p>
        <p className="text-xs text-text-muted mt-1">
          or click to choose · max{" "}
          {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB / file
        </p>
        <p className="text-[10px] text-text-subtle mt-2">
          Accepted MIME: {Array.from(ACCEPTED_IMAGING_MIME).join(" · ")}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".dcm,application/dicom,application/octet-stream,image/jpeg,image/png,image/tiff"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="text-sm divide-y divide-border/60 border border-border rounded-lg bg-surface-raised">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-text">{f.name}</p>
                <p className="text-xs text-text-muted">
                  {(f.size / 1024).toFixed(0)} KB · {f.type || "unknown type"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-text-subtle hover:text-text text-sm"
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {result && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          <p className="font-medium">{result.message}</p>
          {result.rejected && result.rejected.length > 0 && (
            <ul className="mt-1 text-xs list-disc pl-5">
              {result.rejected.map((r, i) => (
                <li key={i}>
                  <span className="font-mono">{r.name}</span>: {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            "h-10 px-4 rounded-md text-sm font-medium",
            canSubmit
              ? "bg-accent text-accent-ink hover:bg-accent-strong"
              : "bg-surface-muted text-text-subtle cursor-not-allowed",
          )}
        >
          {submitting ? "Uploading…" : "Register study"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-text-subtle font-semibold mb-1">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
