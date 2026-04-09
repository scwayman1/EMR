"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UploadForm } from "./upload-form";
import { DocumentCard, type DocumentData } from "./document-card";
import Link from "next/link";

export function RecordsShell({
  documents,
  showUpload,
  isEmpty,
}: {
  documents: DocumentData[];
  showUpload: boolean;
  isEmpty: boolean;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Upload section */}
      {showUpload && (
        <div className="mb-6">
          <UploadForm
            onClose={() => router.push("/portal/records")}
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !showUpload && (
        <EmptyState
          title="No documents yet"
          description="Drag a PDF or image here, or click upload. Everything is encrypted and only visible to your care team."
          action={
            <Link href="/portal/records?upload=1">
              <Button>Upload a file</Button>
            </Link>
          }
        />
      )}

      {/* Filtered empty state (has docs overall but none match filter) */}
      {!isEmpty && documents.length === 0 && !showUpload && (
        <EmptyState
          title="No documents match this filter"
          description="Try a different category or view all documents."
          action={
            <Link href="/portal/records">
              <Button variant="secondary">View all</Button>
            </Link>
          }
        />
      )}

      {/* Document cards */}
      {documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
