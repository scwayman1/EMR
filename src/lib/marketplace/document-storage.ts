// EMR-241 — pluggable storage backend for encrypted vendor documents.
//
// Local-fs backend is the default for dev and CI: writes encrypted
// blobs to DOCUMENT_STORAGE_DIR (default /tmp/leafjourney-documents).
// S3 backend is a stub interface — wire up @aws-sdk/client-s3 once
// the production bucket is provisioned. The backend is selected by
// DOCUMENT_STORAGE_BACKEND env var ("local" | "s3").
//
// Document keys follow `{vendorId}/{documentType}/{version}.enc` so
// re-uploads are versioned in storage; the latest pointer lives on
// VendorDocument.fileUrl.

import { mkdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";

export interface StorageBackend {
  /** Write an encrypted blob and return the storage key (path / s3 URI). */
  put(key: string, blob: Buffer): Promise<{ storageKey: string }>;
  /** Read an encrypted blob by storage key. */
  get(storageKey: string): Promise<Buffer>;
}

class LocalFsBackend implements StorageBackend {
  constructor(private readonly rootDir: string) {}

  async put(key: string, blob: Buffer): Promise<{ storageKey: string }> {
    const fullPath = join(this.rootDir, key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, blob, { mode: 0o600 });
    return { storageKey: `local-fs:${fullPath}` };
  }

  async get(storageKey: string): Promise<Buffer> {
    if (!storageKey.startsWith("local-fs:")) {
      throw new Error(`local-fs backend cannot read storage key ${storageKey}`);
    }
    return readFile(storageKey.slice("local-fs:".length));
  }
}

class S3StubBackend implements StorageBackend {
  // TODO(EMR-241): wire @aws-sdk/client-s3 once the production bucket
  // is provisioned. Bucket name comes from DOCUMENT_S3_BUCKET; region
  // from DOCUMENT_S3_REGION; credentials from the standard AWS env
  // vars. Use SSE-KMS in addition to our envelope encryption so the
  // bucket itself is encrypted at rest by AWS.
  async put(_key: string, _blob: Buffer): Promise<{ storageKey: string }> {
    throw new Error(
      "S3 backend not implemented. Set DOCUMENT_STORAGE_BACKEND=local for dev or wire S3 client.",
    );
  }
  async get(_storageKey: string): Promise<Buffer> {
    throw new Error("S3 backend not implemented.");
  }
}

let cachedBackend: StorageBackend | null = null;

export function getStorageBackend(): StorageBackend {
  if (cachedBackend) return cachedBackend;
  const choice = process.env.DOCUMENT_STORAGE_BACKEND ?? "local";
  if (choice === "local") {
    cachedBackend = new LocalFsBackend(
      process.env.DOCUMENT_STORAGE_DIR ?? "/tmp/leafjourney-documents",
    );
  } else if (choice === "s3") {
    cachedBackend = new S3StubBackend();
  } else {
    throw new Error(`unknown DOCUMENT_STORAGE_BACKEND: ${choice}`);
  }
  return cachedBackend;
}

/** Test helper. Resets the cached backend so env changes take effect. */
export function _resetBackendForTesting(): void {
  cachedBackend = null;
}

export function buildDocumentKey(
  vendorId: string,
  documentType: string,
  version: number,
): string {
  return `${vendorId}/${documentType}/${version}.enc`;
}
