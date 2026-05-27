"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportSchedulingCsvAction } from "./actions";

export function ExportCsvButton({ orgScopedRows }: { orgScopedRows: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handle = () => {
    setError(null);
    startTransition(async () => {
      const result = await exportSchedulingCsvAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button variant="secondary" onClick={handle} disabled={pending || orgScopedRows === 0}>
        {pending ? "Exporting…" : `Export CSV (${orgScopedRows} rows)`}
      </Button>
    </div>
  );
}
