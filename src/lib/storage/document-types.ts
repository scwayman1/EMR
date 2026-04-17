import type { DocumentKind } from "@prisma/client";

export const ALLOWED_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "text/plain",
  "text/csv",
]);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function inferKind(mimeType: string): DocumentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "other";
  return "unclassified";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
