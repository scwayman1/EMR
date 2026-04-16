"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  formatBytes,
} from "@/lib/storage/document-types";

export type UploadResult = { ok: true } | { ok: false; error: string };

/**
 * File upload form. Client-side pre-validates the MIME type + size
 * so the user gets fast feedback; server action re-validates
 * because client checks are never trustworthy. The server action is
 * passed in as a prop so patient and clinician routes can supply
 * their own authorization.
 */
export function UploadForm({
  action,
  patientId,
}: {
  action: (formData: FormData) => Promise<UploadResult>;
  patientId?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const accept = Array.from(ALLOWED_MIME_TYPES).join(",");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setServerError(null);
    if (!file) {
      setSelectedName(null);
      setClientError(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(
        `File is ${formatBytes(file.size)} \u2014 the limit is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
      );
      setSelectedName(null);
      e.target.value = "";
      return;
    }
    // Some files (HEIC from iOS, CSV from some sources) have empty or
    // generic MIME types from the browser. Be lenient here; server
    // re-validates and sniffs by extension if needed.
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      setClientError(`"${file.type}" is not an allowed file type.`);
      setSelectedName(null);
      e.target.value = "";
      return;
    }
    setClientError(null);
    setSelectedName(file.name);
  }

  async function handleSubmit(formData: FormData) {
    setServerError(null);
    const result = await action(formData);
    if (result.ok === false) {
      setServerError(result.error);
      return;
    }
    formRef.current?.reset();
    setSelectedName(null);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      {patientId && <input type="hidden" name="patientId" value={patientId} />}

      <label className="block">
        <span className="text-sm font-medium text-text">Choose a file</span>
        <input
          type="file"
          name="file"
          required
          accept={accept}
          onChange={onFileChange}
          className="mt-1 block w-full text-sm text-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface-muted file:text-text file:text-sm file:font-medium hover:file:bg-surface-muted/70"
        />
        <span className="block text-xs text-text-subtle mt-1">
          PDF, images, Office docs, CSV, or plain text. Up to{" "}
          {formatBytes(MAX_FILE_SIZE_BYTES)}.
        </span>
      </label>

      {selectedName && !clientError && (
        <p className="text-xs text-text-muted">Ready to upload: {selectedName}</p>
      )}
      {clientError && <p className="text-sm text-danger">{clientError}</p>}
      {serverError && <p className="text-sm text-danger">{serverError}</p>}

      <div className="flex justify-end">
        <SubmitButton disabled={Boolean(clientError)} />
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Uploading\u2026" : "Upload"}
    </Button>
  );
}
