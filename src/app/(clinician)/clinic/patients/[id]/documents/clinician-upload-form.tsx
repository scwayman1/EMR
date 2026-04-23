"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadClinicianDocumentAction } from "./actions";

export function ClinicianUploadForm({
  patientId,
  onDone,
}: {
  patientId: string;
  onDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("patientId", patientId);
      fd.append("file", file);
      const result = await uploadClinicianDocumentAction(fd);
      if (result.ok) {
        setSuccess(true);
        if (inputRef.current) inputRef.current.value = "";
        setTimeout(() => {
          setSuccess(false);
          onDone?.();
        }, 1500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xlsx,.xls,.csv,.txt,.heic"
        className="block w-full text-sm text-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface-muted file:text-text file:text-sm file:font-medium hover:file:bg-surface-muted/70"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {success && <p className="text-xs text-accent">Uploaded!</p>}
      <Button size="sm" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Uploading\u2026" : "Upload"}
      </Button>
    </div>
  );
}
