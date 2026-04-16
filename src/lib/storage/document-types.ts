import type { DocumentKind } from "@prisma/client";

/**
 * MIME type allowlist for document uploads. User chose "broad
 * allowlist" (PDF + images + Office + CSV + plain text). No scripts,
 * no executables \u2014 lower attack surface than "anything," broader
 * than PDFs-only.
 */
export const ALLOWED_MIME_TYPES = new Set<string>([
  // PDFs
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/gif",
  // Office (modern)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  // Office (legacy) \u2014 some older patient uploads still come as .doc/.xls
  "application/msword",
  "application/vnd.ms-excel",
  // Plain text + CSV
  "text/plain",
  "text/csv",
]);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per file

/** Infer a reasonable default DocumentKind from MIME type. A
 *  clinician can always recategorize later. */
export function inferKind(mimeType: string): DocumentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "other";
  return "unclassified";
}

/** True if the MIME type typically renders inline in a browser.
 *  Used to decide whether to show "View" (inline) or "Download". */
export function rendersInline(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/") ||
    mimeType === "text/plain" ||
    mimeType === "text/csv"
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
